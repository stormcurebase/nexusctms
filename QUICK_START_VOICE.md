# Quick Start - Voice Assistant Testing

## Step 1: Add Your API Key

Edit `.env` and replace `YOUR_API_KEY_HERE` with your actual Gemini API key:

```bash
VITE_GEMINI_API_KEY=AIzaSy_your_actual_key_here
```

Get your key at: https://aistudio.google.com/apikey

## Step 2: Start the App

```bash
npm run dev
```

## Step 3: Test Patient Call Simulation

1. Open http://localhost:3000 in your browser
2. Click the **green "Simulate Patient Call"** button (bottom-right)
3. **Allow microphone access** when prompted
4. Wait for AI greeting: "Thank you for calling Nexus Clinical..."

## Test Scenarios

### Scenario 1: New Patient Registration ⭐ START HERE

**Say:** "Hi, I want to join your clinical trial"

**AI will ask for:**
- First name
- Last name
- Date of birth

**Then AI will:**
- Register you in the system
- Offer to schedule a Screening Visit

**Try responding:** "Yes, schedule me for next Tuesday"

---

### Scenario 2: Check Existing Appointment

**Say:** "When is my next appointment?"

**Existing patients to test with:**
- John Doe, April 12, 1985
- Alice Smith, September 23, 1979

**AI will:**
- Verify your identity
- Tell you your scheduled visits

---

### Scenario 3: Report Side Effects

**Say:** "I'm experiencing severe headaches"

**AI will:**
- Ask for identity verification
- Collect details about severity
- Create an adverse event report
- Generate a high-priority alert

---

### Scenario 4: Reschedule Visit

**Say:** "I need to reschedule my appointment"

**AI will:**
- Verify identity
- Ask for new preferred date
- Update the calendar

---

## Visual Feedback to Watch For

✅ **Pulsing blue/green circle** - AI is active and listening
✅ **Audio level indicator** - Responds to your voice
✅ **"Verified: [Patient ID]" badge** - Identity confirmed
✅ **Dashboard updates** - Watch alerts and calendar change in real-time

## Common Voice Commands

### For New Patients:
- "I want to participate in the study"
- "How do I sign up?"
- "I'm interested in the clinical trial"

### For Existing Patients:
- "When is my next visit?"
- "Schedule an appointment"
- "I need to reschedule"
- "I'm having side effects"
- "Tell me about the study"

### Emergency Test:
- "I'm having chest pain" → AI will instruct to call 911

## Troubleshooting

**Problem:** Button shows "Connecting..." forever
- **Solution:** Check API key in `.env`, restart server

**Problem:** "API key not configured" alert
- **Solution:** Add key to `.env`, must start with `AIzaSy`

**Problem:** No response when speaking
- **Solution:** Check microphone permissions, speak louder

**Problem:** "Patient not found"
- **Solution:** Register as new patient first, or use existing patient names above

## Pro Tips

💡 The AI remembers context - you don't need to repeat your name after verification
💡 Speak naturally - no need for robotic commands
💡 Check the dashboard after each action to see real-time updates
💡 Try different phrasings - the AI understands variations
💡 For testing, use dates like "next Tuesday" or "November 25th"

## What Happens Behind the Scenes

When you interact with the voice assistant:

1. **Audio Processing** - Your voice is converted to PCM16 format
2. **Gemini Live API** - Sends audio stream to Google's servers
3. **Function Calling** - AI calls tools to interact with the app:
   - `verify_patient()` - Checks identity
   - `register_new_patient()` - Adds to database
   - `schedule_visit()` - Creates appointments
   - `report_adverse_event()` - Logs safety events
4. **Real-time Updates** - Dashboard, calendar, and alerts update instantly

## Ready to Test?

1. **Add your API key** to `.env`
2. **Restart the dev server**
3. **Click the green button** in bottom-right
4. **Allow microphone** access
5. **Start talking!** 🎤

The AI is smart enough to handle natural conversations - just talk to it like you would a real receptionist!

---

**Need help?** Check the full [VOICE_ASSISTANT_GUIDE.md](./VOICE_ASSISTANT_GUIDE.md) for detailed documentation.
