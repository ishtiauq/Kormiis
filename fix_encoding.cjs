const fs = require('fs');
let c = fs.readFileSync('src/components/Announcements.jsx', 'utf8');

const match = c.match(/reactions: \{ '👍 ': \[\], '(.*?)': \[\]/);
if (match) {
  const mojibake = match[1];
  console.log('Found mojibake:', mojibake);
  c = c.split(mojibake).join('❤️');
  
  // Also clean up any lingering '👍 ' to '👍' just in case, wait, don't do this if '👍 ' is used as a key elsewhere, but let's just make it '👍'
  c = c.split("'👍 '").join("'👍'");
  
  fs.writeFileSync('src/components/Announcements.jsx', c);
} else {
  console.log('No match found');
}
