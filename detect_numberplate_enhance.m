clc;
clear;
close all;

% High-quality CCTV enhancement + number plate detection
% Works in MATLAB Online

imageFile = 'yourimage.jpg';   % Change this to your uploaded image name

img = imread(imageFile);

if size(img,3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end

gray = im2double(gray);

% Step 1: Improve image quality
gray1 = wiener2(gray,[5 5]);
gray2 = adapthisteq(gray1,'ClipLimit',0.02);
gray3 = imsharpen(gray2,'Radius',2,'Amount',2.5);
gray4 = imadjust(gray3);

% Step 2: Detect possible number plate region
edgeImg = edge(gray4,'Canny');
se1 = strel('rectangle',[3 15]);
se2 = strel('rectangle',[5 25]);

morph1 = imdilate(edgeImg,se1);
morph2 = imclose(morph1,se2);
morph3 = imfill(morph2,'holes');
morph4 = bwareaopen(morph3,200);

stats = regionprops(morph4,'BoundingBox','Area');

bestBox = [];
bestScore = -inf;

for k = 1:length(stats)
    box = stats(k).BoundingBox;
    w = box(3);
    h = box(4);
    ratio = w / h;
    area = stats(k).Area;

    % Number plates are usually wide rectangles
    if ratio > 2 && ratio < 6.5 && area > 500
        score = area + 200 * ratio;
        if score > bestScore
            bestScore = score;
            bestBox = box;
        end
    end
end

figure;
imshow(gray4,[]);
title('Enhanced Image');

if isempty(bestBox)
    disp('Automatic number plate detection failed.');
    disp('Select the plate manually.');

    figure;
    imshow(img);
    title('Draw box on number plate and double click');
    bestBox = round(drawrectangle('Color','g').Position);
else
    figure;
    imshow(img);
    hold on;
    rectangle('Position',bestBox,'EdgeColor','g','LineWidth',2);
    title('Detected Number Plate');
    hold off;
end

plate = imcrop(gray4,bestBox);
plate = imresize(plate,4,'bicubic');
plate = adapthisteq(plate,'ClipLimit',0.03);
plate = imsharpen(plate,'Radius',2,'Amount',3);
plate = medfilt2(plate,[3 3]);

% OCR-friendly binary image
plateBinary = imbinarize(imcomplement(plate),'adaptive','Sensitivity',0.45);
plateBinary = bwareaopen(plateBinary,30);

figure;
subplot(1,2,1);
imshow(plate,[]);
title('Enhanced Number Plate');

subplot(1,2,2);
imshow(plateBinary,[]);
title('Detected Plate Binary');

imwrite(gray4,'enhanced_full_image.png');
imwrite(plate,'enhanced_number_plate.png');
imwrite(plateBinary,'number_plate_binary.png');

disp('Done.');
disp('Saved files:');
disp('enhanced_full_image.png');
disp('enhanced_number_plate.png');
disp('number_plate_binary.png');
