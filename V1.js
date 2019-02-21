/* @flow */

/*

This is just a draft of what a JavaScript consumption of
FoodRepo's API could be

*/

import GenericAPI from 'salathegroup_apis_common';

import FileSystem from 'react-native-fs';

async function addImageToData(image, idx, data) {
  // Android RN networking doesn't support uri: data:image/jpeg;base64,....
  // nor base64: ...
  const re = /^data:(\w*\/\w*?)(;base64)?,/;
  const matches = image.match(re);
  let type;
  let imagePath = null;
  const fileName = `${Date.now()}-${idx}.jpg`;
  if (matches) {
    let isBase64;
    [, type, isBase64] = matches;
    if (isBase64) {
      // Get base64 and remove line breaks
      const value = image.substr(matches[0].length).replace(/\s+/g, '');
      let tempPath = FileSystem.TemporaryDirectoryPath;
      if (!/[\\/]$/.test(tempPath)) {
        tempPath += '/';
      }
      imagePath = `${tempPath}${fileName}`;
      await FileSystem.writeFile(imagePath, value, 'base64');
    }
  } else {
    type = 'image/jpeg';
  }

  // $FlowExpectedError
  data.append(`submission[submission_images_attributes][${idx}][data]`, {
    name: fileName,
    type,
    uri: imagePath ? `file://${imagePath}` : image,
  });
}

export default class FoodRepoAPI extends GenericAPI {
  static defaultHost = 'https://www.foodrepo.org';

  static revision = 'ALPHA';

  constructor(host: string = '', version: string = '1') {
    super(
      '_',
      host || FoodRepoAPI.defaultHost,
      version,
      'auto',
      'multipart/form-data',
    );
  }

  async postSubmission(barcode: string, country: string, images: string[]) {
    if (!barcode || !country || !images) {
      throw new Error('Invalid arguments in postSubmission');
    }
    const data = new FormData();
    data.append('submission[barcode]', barcode);
    data.append('submission[country]', country);
    const results = [];
    images.forEach((image, idx) => {
      if (idx === 0) {
        data.append(`submission[submission_images_attributes][${idx}][front]`, 'true');
      }
      results.push(addImageToData(image, idx, data));
    });
    await Promise.all(results);
    return this.requestPostURL('submissions', data);
  }
}
