const { makeWASocket, useMultiFileAuthState, Buffer } = require('@whiskeysockets/baileys');
const pino = require('pino');

// Vercel environment ke liye logger
const logger = pino({ level: 'silent' });

// Vercel Serverless Function
export default async function handler(req, res) {
    // CORS Headers (Access control)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { number } = req.body;

    if (!number) {
        return res.status(400).json({ error: 'Number is required' });
    }

    try {
        // Vercel par files save nahi hoti, isliye hum in-memory state use karte hain
        // Yeh sirf code generate karne ke liye hai.
        // Persistent session ke liye aapko Database (MongoDB) use karna hoga.
        
        const authState = await useMultiFileAuthState('/tmp/session_' + number); // Temporary path

        const sock = makeWASocket({
            auth: authState.state,
            printQRInTerminal: false,
            logger,
            browser: ['Vercel Bot', 'Chrome', '1.0.0'],
        });

        // Agar registered nahi hai to code maango
        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(number);
            const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
            
            // Creds save (temporary for this request)
            await authState.saveCreds();

            return res.status(200).json({ 
                success: true, 
                code: formattedCode,
                message: 'Code generated successfully'
            });
        } else {
            return res.status(200).json({ 
                success: true, 
                code: 'Already Linked', 
                message: 'Session exists'
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}