# Voice Assistant - Patient Call Simulation Guide

## Overview

The Nexus Clinical CTMS includes an advanced AI-powered Voice Receptionist built with Google's Gemini Live API. This feature can simulate incoming patient calls with real-time voice interaction.

## Setup Requirements

### 1. Get a Gemini API Key

1. Visit https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Update Environment Variables

Replace `YOUR_API_KEY_HERE` in `.env` with your actual API key:

```
VITE_GEMINI_API_KEY=AIzaSyABC123YourActualKeyHere
```

### 3. Restart the Development Server

After updating the .env file:
```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## How to Use the Voice Assistant

### Accessing the Feature

1. **Open the application** in your browser at http://localhost:3000
2. **Look for the floating button** in the bottom-right corner
3. You'll see two options:
   - **"Simulate Patient Call"** (green button with phone icon)
   - **"Voice Assistant"** (blue button for staff)

### Simulating a Patient Call

1. **Click "Simulate Patient Call"** button
2. **Allow microphone access** when prompted by your browser
3. The AI receptionist will automatically greet you with:
   - "Thank you for calling Nexus Clinical. How can I help you today?"

### What the AI Can Do

The voice assistant is context-aware and can handle:

#### **New Patient Registration**
- Say: *"Hi, I'm interested in joining your clinical trial"*
- AI will ask for: First name, last name, date of birth
- AI will register you in the system
- AI will automatically offer to schedule a Screening Visit

#### **Appointment Scheduling**
- Say: *"I need to schedule an appointment"*
- AI will verify your identity (name + DOB)
- AI will ask for preferred date
- AI will confirm the visit is scheduled

#### **Check Existing Appointments**
- Say: *"When is my next visit?"*
- AI will verify your identity first
- AI will retrieve and read your scheduled visits

#### **Reschedule Visits**
- Say: *"I need to reschedule my appointment"*
- AI will verify your identity
- AI will ask for the new date
- AI will update the system

#### **Report Adverse Events**
- Say: *"I'm experiencing side effects"* or *"I have a severe headache"*
- AI will collect details about the event
- AI will assess severity
- AI will create an adverse event report
- High-severity events trigger immediate alerts

#### **Study Information**
- Say: *"Can you tell me about the study?"*
- AI provides protocol details, phase, recruitment status

#### **Emergency Handling**
- If you mention life-threatening symptoms
- AI will immediately instruct: "Please hang up and dial 911"

### Real-Time Features

**The AI Remembers Context:**
- Once you provide your name and DOB, you don't need to repeat it
- The conversation flows naturally like talking to a real receptionist
- Follow-up questions reference previous statements

**Visual Feedback:**
- Pulsing animation shows AI is listening
- Audio level indicator responds to your voice
- "Verified" badge shows when patient identity is confirmed

**System Integration:**
- All actions update the dashboard in real-time
- Scheduled visits appear in the calendar
- Adverse events generate alerts
- New patients are added to the patient directory

## Voice Assistant Capabilities in Detail

### Patient Verification System

The AI uses a secure two-factor verification:
1. **Full Name** - Searches patient database
2. **Date of Birth** - Confirms identity

Only after verification can patients:
- View their appointments
- Schedule/reschedule visits
- Update their information

### Natural Language Processing

The AI understands various phrasings:
- "When is my appointment?" = "What's my next visit date?"
- "I need to come in" = "Schedule a visit"
- "I'm not feeling well" = "Report an adverse event"
- "I can't make it tomorrow" = "Reschedule my visit"

### Protocol-Aware Responses

The AI has access to:
- Current study protocol (NEXUS-X01)
- Inclusion/exclusion criteria
- Study phase and recruitment targets
- Site contact information

When asked about the study, it provides accurate, study-specific information.

## Sample Conversation Flow

### Example 1: New Patient Registration

```
🎤 YOU: "Hi, I saw your ad about the cancer study and want to participate"

🤖 AI: "Welcome! I'd be happy to help you register for our Phase II
      immunotherapy study. May I have your first and last name?"

🎤 YOU: "Sarah Johnson"

🤖 AI: "Thank you, Sarah. And what is your date of birth?"

🎤 YOU: "March 15th, 1975"

🤖 AI: "Perfect, Sarah Johnson, born March 15, 1975. I've registered
      you in our system with ID 106-4521. Would you like to schedule
      your Screening Visit now?"

🎤 YOU: "Yes, how about next Tuesday?"

🤖 AI: "I've scheduled your Screening Visit for Tuesday, November 26,
      2024 at 9:00 AM. You'll receive a confirmation. Is there
      anything else I can help with?"
```

### Example 2: Checking Appointments

```
🎤 YOU: "Hi, when is my next appointment?"

🤖 AI: "I can help with that. For security, may I have your full name
      and date of birth?"

🎤 YOU: "John Doe, April 12, 1985"

🤖 AI: "Thank you, John. I've verified your identity. You have your
      Week 4 Visit scheduled for November 29, 2023. Would you like
      to reschedule or is this still good for you?"
```

### Example 3: Reporting Adverse Event

```
🎤 YOU: "I'm having really bad headaches since starting the medication"

🤖 AI: "I'm sorry to hear that. I need to document this as an adverse
      event. May I have your name and date of birth for verification?"

🎤 YOU: "Alice Smith, September 23, 1979"

🤖 AI: "Thank you for verifying, Alice. Can you describe the headaches
      - are they mild, moderate, or severe?"

🎤 YOU: "They're pretty severe, actually"

🤖 AI: "I've documented this as a Severe adverse event and created a
      high-priority alert for the study team. They will contact you
      shortly. In the meantime, if symptoms worsen or become
      life-threatening, please call 911 immediately."
```

## Staff Voice Assistant Mode

Click the **blue "Voice Assistant"** button for staff features:

### Staff-Only Capabilities

1. **Navigate the App**
   - "Go to dashboard"
   - "Show me the patients list"
   - "Open the calendar"

2. **Open Action Modals**
   - "I want to add a patient" → Opens patient registration form
   - "Schedule a visit" → Opens scheduling modal

3. **Patient Lookup**
   - "Find John Doe" → Searches and displays patient record
   - Automatically opens patient details if one match found

4. **Complex Queries**
   - Ask about protocol details
   - Check recruitment status
   - Query study progress

### Staff vs Patient Mode Differences

| Feature | Patient Mode | Staff Mode |
|---------|-------------|------------|
| **Greeting** | "Thank you for calling..." | "How can I assist you?" |
| **Navigation** | ❌ No | ✅ Can navigate app |
| **UI Control** | ❌ No | ✅ Opens modals/forms |
| **Patient Lookup** | ❌ Only own records | ✅ All patients |
| **Voice** | Fenrir (patient-friendly) | Kore (professional) |
| **Identity Verification** | ✅ Required | ❌ Not required |

## Technical Details

### Audio Processing
- **Sample Rate**: 16kHz input, 24kHz output
- **Format**: PCM16 audio streaming
- **Latency**: Real-time with minimal delay
- **Browser Support**: Chrome, Edge, Safari (requires mic permissions)

### AI Model
- **Model**: Gemini 2.5 Flash with Native Audio
- **Modality**: Audio input and output
- **Function Calling**: 9 tools for system integration
- **Context**: Maintains conversation state throughout session

### Security & Privacy
- Microphone access required (user must grant permission)
- Audio is processed by Google's servers (Gemini API)
- No audio recording is stored locally
- Patient verification required for sensitive operations

## Troubleshooting

### "Gemini API key not configured"
- Check `.env` file has `VITE_GEMINI_API_KEY=your_key`
- Restart dev server after adding key
- Verify key is valid at https://aistudio.google.com

### "Microphone permission denied"
- Click the lock icon in browser address bar
- Allow microphone access
- Refresh page and try again

### "Connection timed out"
- Check internet connection
- Verify Gemini API is accessible (not blocked by firewall)
- Try again in a few moments

### "Patient not found"
- Make sure you're using the exact name as registered
- Check spelling (case-insensitive but spelling matters)
- Verify patient exists in the current study

### AI doesn't respond
- Speak clearly and at normal volume
- Check audio level indicator is responding
- Ensure microphone is not muted
- Try ending and restarting the session

## Best Practices

1. **Speak Naturally** - The AI understands conversational language
2. **Be Patient** - Allow AI to finish speaking before responding
3. **Verify Information** - Always check the dashboard after voice actions
4. **Use Clear Dates** - Say "November 15" not "the 15th"
5. **Provide Context** - "I need to reschedule my Week 4 visit"

## Future Enhancements

Potential additions:
- Multi-language support
- Voice biometric authentication
- Automated appointment reminders via voice
- Integration with phone systems for real incoming calls
- Voice-based consent form completion
- AI sentiment analysis for patient satisfaction

## Notes

- The voice assistant requires an active internet connection
- Audio processing occurs in real-time with Google's servers
- All database changes are persisted to Supabase
- The AI is protocol-aware and study-specific
- Emergency handling always prioritizes patient safety

---

**Ready to try it?** Just click "Simulate Patient Call" and start talking! 🎤
