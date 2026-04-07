function enhance_cctv_numberplate()
clc;
clearvars;
close all;

% ADVANCED CCTV NUMBER PLATE ENHANCEMENT
% MATLAB Online friendly single-file program
%
% HOW TO USE:
% 1. Upload this file and your CCTV image to MATLAB Online.
% 2. Change the "config.inputImage" value below.
% 3. Run: enhance_cctv_numberplate
% 4. Draw a rectangle around the number plate.
% 5. Review the saved outputs in the "output" folder.
%
% NOTE:
% If the source frame is extremely low-resolution or heavily compressed,
% no algorithm can perfectly restore characters that do not exist in the
% original image. This script tries multiple enhancement strategies and
% saves the strongest outputs for practical plate reading and OCR.

config.inputImage = 'cctv_frame.jpg';
config.outputFolder = 'output';
config.showFigures = true;
config.scaleFactor = 4;
config.tryLucyRichardson = true;
config.lucyIterations = 12;
config.motionLengths = [5 9 13 17];
config.motionAngles = -20:10:20;
config.topCandidatesToSave = 4;
config.characterPolarity = 'dark'; % 'dark' for black text on bright plate

validateInputImage(config.inputImage);
ensureFolder(config.outputFolder);

rgbOriginal = im2double(imread(config.inputImage));
grayOriginal = toGray(rgbOriginal);

if config.showFigures
    showSingle(grayOriginal, 'Original Grayscale CCTV Frame');
end

fullEnhanced = enhanceFullFrame(grayOriginal);

if config.showFigures
    showSingle(fullEnhanced, 'Enhanced Full CCTV Frame');
end

roi = requestPlateROI(rgbOriginal);
plateOriginal = cropSafe(grayOriginal, roi);
plateEnhancedFromFrame = cropSafe(fullEnhanced, roi);

if isempty(plateOriginal) || any(size(plateOriginal) < [20 40])
    error('Selected plate region is too small. Select a larger number plate area.');
end

candidateSet = buildPlateCandidates(plateOriginal, plateEnhancedFromFrame, config);
[bestPlate, bestScore, allScores] = chooseBestPlateCandidate(candidateSet);

ocrReady = createOCRReadyVersion(bestPlate, config.characterPolarity);
edgeView = edge(bestPlate, 'Canny');

saveOutputs(config.outputFolder, fullEnhanced, plateOriginal, candidateSet, allScores, bestPlate, ocrReady, edgeView, config.topCandidatesToSave);

if config.showFigures
    showResults(grayOriginal, fullEnhanced, plateOriginal, candidateSet, allScores, bestPlate, ocrReady, edgeView);
end

disp('Processing complete.');
disp(['Best candidate score: ' num2str(bestScore, '%.4f')]);
disp(['Saved outputs in folder: ' fullfile(pwd, config.outputFolder)]);
disp('Main files:');
disp(['  ' fullfile(config.outputFolder, 'enhanced_full_frame.png')]);
disp(['  ' fullfile(config.outputFolder, 'best_plate_enhanced.png')]);
disp(['  ' fullfile(config.outputFolder, 'best_plate_ocr_ready.png')]);
disp(['  ' fullfile(config.outputFolder, 'best_plate_edges.png')]);

end

function validateInputImage(inputImage)
if ~isfile(inputImage)
    error(['Image file "' inputImage '" not found. Upload the image to MATLAB Online ' ...
        'and update config.inputImage with the correct file name.']);
end
end

function ensureFolder(folderPath)
if ~exist(folderPath, 'dir')
    mkdir(folderPath);
end
end

function gray = toGray(img)
if size(img, 3) == 3
    gray = rgb2gray(img);
else
    gray = img;
end
gray = mat2gray(gray);
end

function showSingle(img, plotTitle)
figure('Name', plotTitle, 'NumberTitle', 'off');
imshow(img, []);
title(plotTitle);
end

function roi = requestPlateROI(rgbOriginal)
figure('Name', 'Select Number Plate', 'NumberTitle', 'off');
imshow(rgbOriginal, []);
title('Draw a rectangle around the number plate, then double-click inside the box');
rect = drawrectangle('Color', 'g', 'LineWidth', 1.5);
wait(rect);
roi = round(rect.Position);

roi(1) = max(1, roi(1));
roi(2) = max(1, roi(2));
roi(3) = max(10, roi(3));
roi(4) = max(10, roi(4));
end

function out = cropSafe(img, roi)
h = size(img, 1);
w = size(img, 2);
x = max(1, roi(1));
y = max(1, roi(2));
plateW = min(roi(3), w - x);
plateH = min(roi(4), h - y);

if plateW < 2 || plateH < 2
    out = [];
    return;
end

out = imcrop(img, [x y plateW plateH]);
out = mat2gray(out);
end

function enhanced = enhanceFullFrame(grayOriginal)
grayOriginal = mat2gray(grayOriginal);

denoised1 = imnlmfilt(grayOriginal, 'DegreeOfSmoothing', 0.01);
denoised2 = wiener2(denoised1, [3 3]);

illumination = imgaussfilt(denoised2, 12);
reflectance = denoised2 ./ max(illumination, 0.05);
reflectance = mat2gray(reflectance);

contrastLocal = adapthisteq(reflectance, 'ClipLimit', 0.008, 'NumTiles', [10 10], ...
    'Distribution', 'rayleigh');

highFreq = contrastLocal - imgaussfilt(contrastLocal, 1.4);
boosted = mat2gray(contrastLocal + 1.1 * highFreq);

enhanced = imsharpen(boosted, 'Radius', 1.7, 'Amount', 1.8, 'Threshold', 0.005);
enhanced = imadjust(enhanced, stretchlim(enhanced, [0.01 0.995]), []);
enhanced = mat2gray(enhanced);
end

function candidateSet = buildPlateCandidates(plateOriginal, plateEnhancedFromFrame, config)
base1 = preprocessPlateBase(plateOriginal, config.scaleFactor);
base2 = preprocessPlateBase(plateEnhancedFromFrame, config.scaleFactor);

candidateSet = {};
candidateSet{end + 1} = plateRefine(base1, 'baseline_from_original');
candidateSet{end + 1} = plateRefine(base2, 'baseline_from_fullframe');

for L = config.motionLengths
    for A = config.motionAngles
        psf = fspecial('motion', L, A);

        wiener1 = deconvwnr(base1, psf, 0.0005);
        candidateSet{end + 1} = plateRefine(wiener1, sprintf('wiener_L%d_A%d', L, A));

        if config.tryLucyRichardson
            lucy1 = deconvlucy(base1, psf, config.lucyIterations);
            candidateSet{end + 1} = plateRefine(lucy1, sprintf('lucy_L%d_A%d', L, A));
        end
    end
end

gaussianSharpen = imsharpen(base2, 'Radius', 2.5, 'Amount', 2.5, 'Threshold', 0.002);
candidateSet{end + 1} = plateRefine(gaussianSharpen, 'aggressive_sharpen');

laplacianKernel = [0 -1 0; -1 5 -1; 0 -1 0];
laplacianBoost = imfilter(base2, laplacianKernel, 'replicate');
candidateSet{end + 1} = plateRefine(laplacianBoost, 'laplacian_boost');
end

function plateBase = preprocessPlateBase(plateInput, scaleFactor)
plateInput = mat2gray(plateInput);
plateInput = imreducehaze(plateInput, 'Method', 'approxdcp');
plateInput = imnlmfilt(plateInput, 'DegreeOfSmoothing', 0.008);
plateInput = adapthisteq(plateInput, 'ClipLimit', 0.01, 'NumTiles', [8 8]);
plateBase = imresize(plateInput, scaleFactor, 'lanczos3');
plateBase = mat2gray(plateBase);
end

function refined = plateRefine(img, label)
img = mat2gray(img);
img = imdiffusefilt(img, 'NumberOfIterations', 4, 'Connectivity', 'maximal');
img = adapthisteq(img, 'ClipLimit', 0.012, 'NumTiles', [8 8], 'Distribution', 'uniform');
img = localContrastBoost(img);
img = imsharpen(img, 'Radius', 1.4, 'Amount', 2.4, 'Threshold', 0);
img = suppressHalos(img);
img = mat2gray(img);

refined.image = img;
refined.label = label;
refined.score = evaluatePlateQuality(img);
end

function boosted = localContrastBoost(img)
fine = img - imgaussfilt(img, 0.8);
medium = img - imgaussfilt(img, 1.8);
boosted = img + 0.9 * fine + 0.4 * medium;
boosted = mat2gray(boosted);
boosted = imadjust(boosted, stretchlim(boosted, [0.01 0.995]), []);
end

function out = suppressHalos(img)
low = imgaussfilt(img, 0.7);
mask = img - low;
out = img;
out(mask > 0.18) = low(mask > 0.18) + 0.18;
out = mat2gray(out);
end

function [bestPlate, bestScore, allScores] = chooseBestPlateCandidate(candidateSet)
n = numel(candidateSet);
allScores = zeros(n, 1);
for k = 1:n
    allScores(k) = candidateSet{k}.score;
end

[bestScore, idx] = max(allScores);
bestPlate = candidateSet{idx}.image;
end

function score = evaluatePlateQuality(img)
img = mat2gray(img);
gx = imfilter(img, [-1 0 1], 'replicate');
gy = imfilter(img, [-1; 0; 1], 'replicate');
gradMag = hypot(gx, gy);

edgeMap = edge(img, 'Canny');
edgeDensity = mean(edgeMap(:));

localStd = stdfilt(img, true(3));
textureStrength = mean(localStd(:));

horizontalProfile = mean(abs(gx), 1);
verticalProfile = mean(abs(gy), 2);
profileStructure = std(horizontalProfile) + std(verticalProfile);

darkChars = imbinarize(imcomplement(img), 'adaptive', 'Sensitivity', 0.52);
brightChars = imbinarize(img, 'adaptive', 'Sensitivity', 0.52);
componentDark = filteredComponentCount(darkChars);
componentBright = filteredComponentCount(brightChars);
charLikeCount = max(componentDark, componentBright);

score = 2.2 * mean(gradMag(:)) + ...
        1.4 * edgeDensity + ...
        1.2 * textureStrength + ...
        0.35 * profileStructure + ...
        0.08 * charLikeCount;
end

function count = filteredComponentCount(binaryImage)
binaryImage = bwareaopen(binaryImage, 15);
binaryImage = imclearborder(binaryImage);
stats = regionprops(binaryImage, 'Area', 'BoundingBox', 'Extent');
count = 0;

for k = 1:numel(stats)
    bb = stats(k).BoundingBox;
    aspect = bb(3) / max(bb(4), 1e-6);
    area = stats(k).Area;
    extent = stats(k).Extent;

    if area >= 20 && area <= 5000 && aspect >= 0.15 && aspect <= 1.2 && extent >= 0.15 && extent <= 0.95
        count = count + 1;
    end
end
end

function ocrReady = createOCRReadyVersion(bestPlate, characterPolarity)
bestPlate = mat2gray(bestPlate);
bestPlate = medfilt2(bestPlate, [3 3]);

if strcmpi(characterPolarity, 'dark')
    binary = imbinarize(imcomplement(bestPlate), 'adaptive', 'ForegroundPolarity', 'bright', ...
        'Sensitivity', 0.50);
else
    binary = imbinarize(bestPlate, 'adaptive', 'ForegroundPolarity', 'bright', ...
        'Sensitivity', 0.50);
end

binary = bwareaopen(binary, 25);
binary = imclose(binary, strel('rectangle', [3 2]));
binary = imopen(binary, strel('rectangle', [2 1]));
binary = imclearborder(binary);

ocrReady = binary;
end

function saveOutputs(outputFolder, fullEnhanced, plateOriginal, candidateSet, allScores, bestPlate, ocrReady, edgeView, topCandidatesToSave)
imwrite(fullEnhanced, fullfile(outputFolder, 'enhanced_full_frame.png'));
imwrite(plateOriginal, fullfile(outputFolder, 'selected_plate_original.png'));
imwrite(bestPlate, fullfile(outputFolder, 'best_plate_enhanced.png'));
imwrite(ocrReady, fullfile(outputFolder, 'best_plate_ocr_ready.png'));
imwrite(edgeView, fullfile(outputFolder, 'best_plate_edges.png'));

[~, sortedIdx] = sort(allScores, 'descend');
topCount = min(topCandidatesToSave, numel(sortedIdx));
for k = 1:topCount
    idx = sortedIdx(k);
    candidateName = sanitizeFilename(candidateSet{idx}.label);
    fileName = sprintf('candidate_%02d_%s.png', k, candidateName);
    imwrite(candidateSet{idx}.image, fullfile(outputFolder, fileName));
end
end

function safeName = sanitizeFilename(inputName)
safeName = regexprep(inputName, '[^a-zA-Z0-9_]', '_');
end

function showResults(grayOriginal, fullEnhanced, plateOriginal, candidateSet, allScores, bestPlate, ocrReady, edgeView)
[~, sortedIdx] = sort(allScores, 'descend');
topCount = min(4, numel(sortedIdx));

figure('Name', 'CCTV Plate Enhancement Results', 'NumberTitle', 'off');
tl = tiledlayout(2, 4, 'Padding', 'compact', 'TileSpacing', 'compact');
title(tl, 'Best Results for CCTV Number Plate Enhancement');

nexttile;
imshow(grayOriginal, []);
title('Original Frame');

nexttile;
imshow(fullEnhanced, []);
title('Enhanced Frame');

nexttile;
imshow(plateOriginal, []);
title('Selected Plate');

nexttile;
imshow(bestPlate, []);
title('Best Plate');

for k = 1:topCount
    nexttile;
    idx = sortedIdx(k);
    imshow(candidateSet{idx}.image, []);
    title(sprintf('%d: %s', k, shortenLabel(candidateSet{idx}.label)));
end

figure('Name', 'OCR Ready Plate', 'NumberTitle', 'off');
subplot(1, 3, 1);
imshow(bestPlate, []);
title('Enhanced Plate');

subplot(1, 3, 2);
imshow(ocrReady, []);
title('OCR Ready');

subplot(1, 3, 3);
imshow(edgeView, []);
title('Edge Map');
end

function label = shortenLabel(label)
if strlength(label) > 18
    label = extractBefore(label, 19);
end
label = char(label);
end
