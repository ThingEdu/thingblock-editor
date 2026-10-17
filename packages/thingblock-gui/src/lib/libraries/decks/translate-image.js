/**
 * @file
 * Utility functions for handling tutorial images.
 * Tutorial images are currently English-only, so every locale
 * resolves to the same image set.
 */

import {enImages as defaultImages} from './en-steps.js';

/**
 * No localized image sets exist; kept because callers invoke it on locale change.
 */
const loadImageData = () => {};

/**
 * Return image data for a tutorial step.
 * @param {string} imageId key in the images object, or id string.
 * @returns {string} image
 */
const translateImage = imageId => defaultImages[imageId];

export {
    loadImageData,
    translateImage
};
