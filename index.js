const fs = require('fs-extra');
const path = require('path');
const ExifReader = require('exifreader');
const glob  = require('fast-glob');
const videoMetadata = require("fast-video-metadata");

const fromPath = 'D:/Photo/2023_ab'
const targetPath = 'D:/Photo/2023_org'
// 사진 파일의 찍은 날짜 정보를 가져오는 함수
async function getPhotoTakenDate(filePath) {
    try {
        const tags = await ExifReader.load(filePath);
        const imageDate = tags['DateTimeOriginal'].description;
    
        return new Date(imageDate.replace(/:/g, '-').split(' ')[0])
    }catch(e) {
        return getMinDate(filePath);
    }
    
}

async function getMinDate(filePath) {
    const stat = await fs.stat(filePath);
         const {mtime, mtimeMs, ctime, ctimeMs, atime, atimeMs} = stat;
         const minDate = Math.min(mtimeMs, ctimeMs, atimeMs);
         return new Date(minDate)
}


async function getMOVFileMetadata(filePath) {
    return await videoMetadata.read(filePath);
  }

function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}-${month}`;
  }

// 메인 함수
async function main() {
  try {
        const files = await glob(fromPath + '/**')
        for(const file of files) {
            const {ext:_ext, name, base} = path.parse(file)
            const ext = _ext.toLowerCase();
            let createDate;

            switch(ext) {
                case '.mov':
                    const metadata = await getMOVFileMetadata(file)
                    createDate = metadata.creationTime;
                    break;
                case '.mp4':
                    createDate = await getMinDate(file)
                    break;
                case '.jpg':
                case '.heic':
                case '.gif':
                case '.png':
                    createDate = await getPhotoTakenDate(file);
                    break;
                case '.aae':

                    continue;
                default:
                    throw Error(`NO EXT -- ${file}`);
            }
           

            if(!createDate || !createDate.getFullYear) {
                throw Error(`NO DATE -- ${file}`)
            }
           
            const folderName = formatDateToYYYYMMDD(createDate);
            const outputPath = path.join(targetPath, folderName)
            await fs.ensureDir(outputPath);
            await fs.copyFile(file, path.join(outputPath, base))
        }
    console.log('===변환 완료===')
  } catch (err) {
    console.error('에러 발생:', err);
  }
}

main();
