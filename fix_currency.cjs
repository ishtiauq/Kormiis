const fs = require('fs');

function fixMojibake(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const replacements = {
        'Ã Â§Â³': '৳',
        'Ã¢â€šÂ¬': '€',
        'Ã‚Â£': '£',
        'Ã¢â€šÂ¹': '₹',
        'Ã‚Â¥': '¥',
        'Ã¢â‚¬â€ ': '— ',
        'Ã¢â‚¬â€': '—',
        'Ã¢â‚¬Â¢': '•',
        'Ã¢â‚¬â€œ': '–',
        'Ã°Å¸â€œÅ ': '📊',
        'Ã¢Å“â€¹': '✋'
    };

    let original = content;
    for (const [mojibake, correct] of Object.entries(replacements)) {
        content = content.split(mojibake).join(correct);
    }
    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', filePath);
    }
}

const dirs = ['src/components', 'src/components/hr', 'src/components/attendance', 'src/components/layout'];
dirs.forEach(dir => {
    if(fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            if(file.endsWith('.jsx') || file.endsWith('.js')) {
                fixMojibake(`${dir}/${file}`);
            }
        });
    }
});
