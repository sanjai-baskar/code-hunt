# Webcam Monitoring System - BEST STRATEGY (v2)

## Problem Solved
**OLD ISSUE**: System was too sensitive, triggering false distractions when students naturally read questions on the left side of the screen.

**ROOT CAUSE**: System was tracking eye gaze + head position together, flagging any deviation as suspicious.

**NEW SOLUTION**: Focus only on ACTUAL malpractice (objects, collaboration, extreme evasion), not natural reading movements.

---

## Strategy: Smart Monitoring vs. Over-Monitoring

### What Gets Flagged (Real Threats - ALWAYS)
| Threat | Action | Timing |
|--------|--------|--------|
| **Forbidden Objects** | Immediate flag | 500ms |
| Phone, Tablet, Laptop, Book | Room-level security |  |
| **Multiple Faces** | Immediate flag | 1000ms |
| Someone else in frame | Collaboration prevention |  |
| **Extreme Head Turns** | Flag after sustained | 5 seconds |
| 50+ degrees away from screen | Obvious evasion attempt |  |
| **Face Hidden** | Immediate flag | 1000ms |
| Camera blocked or turned away | Security violation |  |

### What Is ALLOWED (Natural Behavior - NO PENALTY)
| Behavior | Reason | Details |
|----------|--------|---------|
| **Reading Zone** ✅ | Students must read problems | Up to 40° left turn, 18° upward tilt |
| **Brief Glances** ✅ | Eyes move naturally | Any direction, < 5 seconds |
| **Eye Movement** ✅ | Reading requires eye gaze | Tracked but NOT flagged |
| **Minor Head Shifts** ✅ | Comfort/adjustment | < 40° deviation allowed |
| **Warm-up Period** ✅ | Student settling in | First 15 seconds very lenient |

---

## How It Works

### Phase 1: Warm-up (0-15 seconds)
- Student settling into exam
- Only extreme positions (50+°) trigger warnings
- Eye gaze completely ignored
- Purpose: Reduce anxiety, allow adjustment

### Phase 2: Active Exam (after 15 seconds)
- Normal strict monitoring begins
- Reading zone (left side) is ALLOWED
- Only 40°+ turns flagged (extreme evasion)
- Sustained reading (15+s) suggests cheating

### Detection Logic (Smart)
1. **Check for objects FIRST** → Immediate disqualification
2. **Check for multiple faces** → Immediate disqualification  
3. **Check for extreme positions** → Flag if sustained 5+ seconds
4. **Check for reading zone** → Allow, but monitor duration
5. **Ignore eye gaze entirely** → Eyes move when reading

---

## Why This Works

✅ **Prevents Cheating**:
- Phone/tablet detection catches physical cheating aids
- Multiple faces catches collaboration
- Extreme head turns catch obvious evasion

✅ **Allows Reading**:
- Students can naturally turn head to read problems
- No penalty for legitimate reading movements
- Eyes tracked but not punished

✅ **Reduces False Positives**:
- Not flagging every minor head movement
- Reading zone explicitly allowed
- Quick reset windows for natural movements

✅ **Still Maintains Security**:
- All violations logged for proctor review
- Patterns still observable (sustained behavior)
- 10-distraction limit still enforces compliance

---

## Configuration: Tuning the Thresholds

Edit [useFaceMonitor.js](frontend/src/hooks/useFaceMonitor.js) to adjust:

```javascript
const MONITORING_STRATEGY = {
  // How extreme before flagging
  EXTREME_YAW_LEFT: 0.50,      // 50° left (increase = more lenient)
  EXTREME_YAW_RIGHT: -0.50,    // 50° right (decrease = more lenient)
  EXTREME_PITCH: -0.25,        // 25° down (more negative = more lenient)
  
  // Reading zone tolerance
  READING_ZONE_YAW: 0.40,      // 40° left allowed for reading
  READING_ZONE_PITCH: -0.18,   // 18° up allowed for reading
  
  // Timing
  WARM_UP_PERIOD_MS: 15000,    // First 15s lenient
  SUSTAINED_EXTREME_MS: 5000,  // 5s of extreme = flag
  SUSTAINED_READING_MS: 15000, // 15s reading = probably cheating
};
```

---

## Testing Scenarios

### ✅ Should PASS (Not flagged)
- [ ] Turn head left to read questions (natural reading)
- [ ] Quick glance at problems on left
- [ ] Nod head or shift slightly
- [ ] Look down at keyboard then back
- [ ] Read for 5 seconds, return to center

### ❌ Should FAIL (Flagged)
- [ ] Hold phone next to screen
- [ ] Another person enters frame
- [ ] Turn head 60° and maintain for 5+ seconds
- [ ] Hide face from camera
- [ ] Read questions for 20+ seconds continuously

### 🟡 Edge Cases (Requires monitoring)
- [ ] Sustained reading of left side (>15s) - might be legitimate or cheating
- [ ] Extreme head turn for 1-2 seconds - brief but suspicious
- [ ] Proctor reviews logs to determine intent

---

## Proctor Dashboard Integration

All violations include:
- **Type**: object-phone, multiple-faces, extreme-position, reading-zone, away
- **Duration**: How long behavior lasted
- **Timestamp**: When it occurred
- **Code snapshot**: What student coded at that moment

Proctors can distinguish:
- **Legitimate reading**: Brief left-turn + code continuing naturally
- **Suspicious behavior**: Extreme turns + code stalled/unchanged
- **Collaboration**: Multiple faces + rapid code changes
- **Device cheating**: Object detection + code copying patterns

---

## Future Enhancements

Consider implementing:
1. **AI Behavior Profiling** - Learn what's normal for each student
2. **Confidence Scoring** - Only flag high-confidence violations
3. **Context Awareness** - Know where problems/code are on screen
4. **Proctor Override** - Allow manual adjustment of sensitivity per exam
5. **Student Feedback** - Tell students what triggered a distraction
6. **Warm-up Calibration** - Auto-detect student's normal head position
