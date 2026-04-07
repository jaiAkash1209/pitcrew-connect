clc;
clear;
close all;

% Gentle CCTV enhancement + number plate extraction
% This version avoids aggressive sharpening that can worsen blurry images.

imageFile = 'yourimage.jpg';   % Change this

img = imread(imageFile);

if size(img,3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end

gray = im2double(gray);

% Gentle enhancement
denoised = wiener2(gray,[3 3]);
contrastImg = adapthisteq(denoised,'ClipLimit',0.008,'NumTiles',[8 8]);
enhanced = imadjust(contrastImg,stretchlim(contrastImg,[0.01 0.99]),[]);

figure;
imshow(enhanced,[]);
title('Gentle Enhanced Image');

% Plate detection using edges and rectangular filtering
edgeImg = edge(enhanced,'Canny');
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
    bestBox = round(drawrectangle('Color','g').Position);
else
    figure;
    imshow(img);
    hold on;
    rectangle('Position',bestBox,'EdgeColor','g','LineWidth',2);
    title('Detected Number Plate');
    hold off;
end

plate = imcrop(enhanced,bestBox);
plateZoom = imresize(plate,2,'bicubic');
plateFinal = adapthisteq(plateZoom,'ClipLimit',0.01,'NumTiles',[8 8]);

figure;
subplot(1,2,1);
imshow(plateZoom,[]);
title('Zoomed Plate');

subplot(1,2,2);
imshow(plateFinal,[]);
title('Final Plate');

imwrite(enhanced,'gentle_enhanced_full_image.png');
imwrite(plateFinal,'gentle_number_plate.png');

disp('Saved files:');
disp('gentle_enhanced_full_image.png');
disp('gentle_number_plate.png');
