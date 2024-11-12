import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';  // Use 'import' instead of 'require'
const app = express();

// Replace with your Facebook Page Access Token and Webhook Verification Token
const PAGE_ACCESS_TOKEN = 'EAAZAla0AZCCdUBOyYZAugtu3Sfzc0Kyi1jlMAOFMHFIRKG3xwIPPDVuxxkPRbY8AdTUhyda1m5FAHs2gezUlYWTUWQKlgc5etYM83keXimfFrtkaviK5iP9Sx5NqA3zrLxZA17PoMd0KNZCRiv8UovOCP4D9l1q9ox0OYnS1ZB2ZBpnIpupgBMexrZA6TRe5AclRcgZDZD';
const VERIFY_TOKEN = 'pagebot';

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Webhook verification (GET method)
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403); // Forbidden
    }
});

// Webhook for receiving messages (POST method)
app.post('/webhook', (req, res) => {
    const data = req.body;

    // Ensure this is from a page subscription
    if (data.object === 'page') {
        data.entry.forEach(entry => {
            const messagingEvents = entry.messaging;
            messagingEvents.forEach(event => {
                const senderId = event.sender.id;

                if (event.message) {
                    if (event.message.text) {
                        // Respond to text message
                        sendTextMessage(senderId, "Thanks for your message!");
                    } else if (event.message.attachments) {
                        // Handle image attachments or other media
                        handleImageAttachment(senderId, event.message.attachments);
                    }
                }
            });
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Function to send a text message response
function sendTextMessage(senderId, messageText) {
    const messageData = {
        recipient: { id: senderId },
        message: { text: messageText }
    };

    // Sending message using Facebook's Send API
    callSendAPI(messageData);
}

// Function to handle image attachments
function handleImageAttachment(senderId, attachments) {
    attachments.forEach(attachment => {
        if (attachment.type === 'image') {
            const imageUrl = attachment.payload.url;

            // Send the image URL to an AI service or simply respond
            sendTextMessage(senderId, `I received your image: ${imageUrl}`);

            // You can integrate AI for image recognition here
            analyzeImage(imageUrl).then(response => {
                sendTextMessage(senderId, `Here's what I see in your image: ${response}`);
            });
        }
    });
}

// Function to send requests via Facebook Send API
function callSendAPI(messageData) {
    fetch(`https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}

// AI-based Image Recognition (Optional - Using Google Vision API)
async function analyzeImage(imageUrl) {
    // Example AI service: You can replace this with Google Vision or any other AI service
    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=AIzaSyDA8aCJIwi3ZcCI6ZAI5CCxnCWvYIy4q9g`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { source: { imageUri: imageUrl } },
                    features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
                }]
            })
        });
        const result = await response.json();
        const labels = result.responses[0].labelAnnotations;
        return labels.map(label => label.description).join(', ');
    } catch (error) {
        console.error('Error analyzing image:', error);
        return 'Unable to analyze the image.';
    }
} 

// Start the Express server
app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running...');
});
