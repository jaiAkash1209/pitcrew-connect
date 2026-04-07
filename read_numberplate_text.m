clc;
clear;
close all;

% Number plate enhancement + OCR text reading
% Change the image file name before running

imageFile = 'yourimage.jpg';   % Example: 'car.jpg'

img = imread(imageFile);

if size(img, 3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end

gray = im2double(gray);

% Gentle enhancement
denoised = wiener2(gray, [3 3]);
contrastImg = adapthisteq(denoised, 'ClipLimit', 0.008, 'NumTiles', [8 8]);
enhanced = imadjust(contrastImg, stretchlim(contrastImg, [0.01 0.99]), []);

% Detect likely number plate region
edgeImg = edge(enhanced, 'Canny');
edgeImg = imdilate(edgeImg, strel('rectangle', [2 8]));
edgeImg = imclose(edgeImg, strel('rectangle', [4 18]));
edgeImg = imfill(edgeImg, 'holes');
edgeImg = bwareaopen(edgeImg, 150);

stats = regionprops(edgeImg, 'BoundingBox', 'Area');
bestBox = [];
bestScore = -inf;

for k = 1:length(stats)
    box = stats(k).BoundingBox;
    w = box(3);
    h = box(4);
    ratio = w / max(h, 1);
    area = stats(k).Area;

    if ratio > 2 && ratio < 6 && area > 300
        score = area + 100 * ratio;
        if score > bestScore
            bestScore = score;
            bestBox = box;
        end
    end
end

if isempty(bestBox)
    figure;
    imshow(img);
    title('Draw box on number plate and double click');
    hRect = drawrectangle('Color', 'g');
    bestBox = round(wait(hRect));
end

plate = imcrop(enhanced, bestBox);
plate = imresize(plate, 3, 'bicubic');
plate = adapthisteq(plate, 'ClipLimit', 0.01, 'NumTiles', [8 8]);

% OCR-friendly binary image
plateBinary = imbinarize(imcomplement(plate), 'adaptive', 'Sensitivity', 0.45);
plateBinary = bwareaopen(plateBinary, 20);

% OCR
ocrResult = ocr(plateBinary, 'CharacterSet', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
plateText = upper(strtrim(ocrResult.Text));
plateText = regexprep(plateText, '[^A-Z0-9]', '');

% Show results
figure;
subplot(1, 3, 1);
imshow(enhanced, []);
title('Enhanced Image');

subplot(1, 3, 2);
imshow(plate, []);
title('Detected Plate');

subplot(1, 3, 3);
imshow(plateBinary, []);
title('OCR Input');

disp('Detected number plate text:');
disp(plateText);

imwrite(enhanced, 'ocr_enhanced_full_image.png');
imwrite(plate, 'ocr_detected_plate.png');
imwrite(plateBinary, 'ocr_plate_binary.png');

fid = fopen('detected_numberplate_text.txt', 'w');
fprintf(fid, '%s\n', plateText);
fclose(fid);

disp('Saved files:');
disp('ocr_enhanced_full_image.png');
disp('ocr_detected_plate.png');
disp('ocr_plate_binary.png');
disp('detected_numberplate_text.txt');
