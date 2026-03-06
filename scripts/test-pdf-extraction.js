const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

const filePath = 'C:\\Users\\advantix-user-002\\Desktop\\hospital-platform\\Sample Pdf\\Sample2.pdf';

if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function (data) {
    console.log('--- START TEXT ---');
    console.log(data.text);
    console.log('--- END TEXT ---');
}).catch(function (error) {
    console.error('Error:', error);
});
