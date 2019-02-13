const fs = require('fs');

const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {  // deletes the file name and the file if it exists
        if(err) {
            throw (err);
        }
    })  
}
exports.deleteFile = deleteFile;
