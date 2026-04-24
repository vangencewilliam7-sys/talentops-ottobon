const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API Key from .env manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const resendKey = envContent.match(/RESEND_API_KEY=(.*)/)?.[1]?.trim();

if (!resendKey) {
    console.error('❌ Error: RESEND_API_KEY not found in .env file');
    process.exit(1);
}

const PORT = 54322;

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/send-email') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const resendReq = https.request('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendKey}`
                }
            }, (resendRes) => {
                let resendBody = '';
                resendRes.on('data', chunk => resendBody += chunk);
                resendRes.on('end', () => {
                    if (resendRes.statusCode !== 200) {
                        console.error(`❌ Resend Error (${resendRes.statusCode}):`, resendBody);
                    } else {
                        console.log(`✅ Email sent successfully!`);
                    }
                    res.writeHead(resendRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(resendBody);
                });
            });

            resendReq.on('error', (e) => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            });

            resendReq.write(body);
            resendReq.end();
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Email Proxy Server running at http://localhost:${PORT}`);
    console.log(`✅ Use this for local testing without Docker.`);
    console.log(`📧 Ready to send emails...\n`);
});
