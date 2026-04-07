clc;
clear;
close all;

% Multi-pass number plate OCR for MATLAB Online
% 1. Upload your image
% 2. Change imageFile
% 3. Run this script
% 4. If auto detection is bad, draw a box around the plate

imageFile = 'yourimage.jpg';   % Change this

img = imread(imageFile);
if size(img,3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end

gray = im2double(gray);

% Gentle enhancement on full frame
base = wiener2(gray,[3 3]);
base = adapthisteq(base,'ClipLimit',0.008,'NumTiles',[8 8]);
base = imadjust(base,stretchlim(base,[0.01 0.99]),[]);

% Find possible plate
edgeImg = edge(base,'Canny');
edgeImg = imdilate(edgeImg,strel('rectangle',[2 8]));
edgeImg = imclose(edgeImg,strel('rectangle',[4 18]));
edgeImg = imfill(edgeImg,'holes');
edgeImg = bwareaopen(edgeImg,150);

stats = regionprops(edgeImg,'BoundingBox','Area');
bestBox = [];
bestScore = -inf;

for k = 1:length(stats)
    box = stats(k).BoundingBox;
    w = box(3);
    h = box(4);
    ratio = w / max(h,1);
    area = stats(k).Area;

    if ratio > 2 && ratio < 7 && area > 200
        score = area + 120 * ratio;
        if score > bestScore
            bestScore = score;
            bestBox = box;
        end
    end
end

if isempty(bestBox)
    figure;
    imshow(img);
    title('Draw a rectangle on the number plate and double click');
    hRect = drawrectangle('Color','g');
    bestBox = round(wait(hRect));
end

plate = imcrop(base,bestBox);
plate = imresize(plate,4,'bicubic');

% Generate multiple plate versions
v1 = plate;
v2 = adapthisteq(plate,'ClipLimit',0.01,'NumTiles',[8 8]);
v3 = imsharpen(v2,'Radius',1.2,'Amount',1.5);
v4 = medfilt2(v2,[3 3]);
v5 = imadjust(v2);
v6 = imcomplement(imbinarize(v2,'adaptive','Sensitivity',0.45));
v7 = imbinarize(imcomplement(v2),'adaptive','Sensitivity',0.45);
v8 = imbinarize(v5,'global');

versions = {v1,v2,v3,v4,v5,v6,v7,v8};
labels = {'gray','clahe','sharp','median','adjust','binary_dark','binary_inv','binary_global'};

bestText = '';
bestTextScore = -inf;
bestImage = [];
bestLabel = '';

for i = 1:length(versions)
    current = versions{i};

    % OCR pass 1
    result1 = ocr(current,'CharacterSet','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    text1 = cleanPlateText(result1.Text);
    score1 = scoreText(text1);
    if score1 > bestTextScore
        bestTextScore = score1;
        bestText = text1;
        bestImage = current;
        bestLabel = [labels{i} '_ocr1'];
    end

    % OCR pass 2 with word layout
    result2 = ocr(current,'CharacterSet','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','TextLayout','Word');
    text2 = cleanPlateText(result2.Text);
    score2 = scoreText(text2);
    if score2 > bestTextScore
        bestTextScore = score2;
        bestText = text2;
        bestImage = current;
        bestLabel = [labels{i} '_ocr2'];
    end

    % OCR pass 3 after stronger resize
    currentBig = imresize(current,2,'bicubic');
    result3 = ocr(currentBig,'CharacterSet','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    text3 = cleanPlateText(result3.Text);
    score3 = scoreText(text3);
    if score3 > bestTextScore
        bestTextScore = score3;
        bestText = text3;
        bestImage = currentBig;
        bestLabel = [labels{i} '_ocr3'];
    end
end

figure;
subplot(1,3,1);
imshow(base,[]);
title('Enhanced Full Image');

subplot(1,3,2);
imshow(plate,[]);
title('Plate Crop');

subplot(1,3,3);
if isempty(bestImage)
    imshow(plate,[]);
else
    imshow(bestImage,[]);
end
title('Best OCR Input');

disp('Detected number plate text:');
disp(bestText);
disp('Best OCR source:');
disp(bestLabel);

imwrite(base,'multipass_enhanced_full_image.png');
imwrite(plate,'multipass_plate_crop.png');
if ~isempty(bestImage)
    imwrite(bestImage,'multipass_best_ocr_input.png');
end

fid = fopen('detected_numberplate_text.txt','w');
fprintf(fid,'%s\n',bestText);
fclose(fid);

disp('Saved files:');
disp('multipass_enhanced_full_image.png');
disp('multipass_plate_crop.png');
disp('multipass_best_ocr_input.png');
disp('detected_numberplate_text.txt');

function out = cleanPlateText(in)
out = upper(strtrim(in));
out = regexprep(out,'[^A-Z0-9]','');
end

function s = scoreText(txt)
len = length(txt);
if len == 0
    s = -100;
    return;
end

numLetters = sum(isstrprop(txt,'alpha'));
numDigits = sum(isstrprop(txt,'digit'));

s = len * 10 + min(numLetters,4) * 3 + min(numDigits,6) * 3;

if len >= 6 && len <= 12
    s = s + 20;
end

if numDigits >= 1 && numLetters >= 1
    s = s + 15;
end
end
