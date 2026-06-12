# Webcam Monitoring System - Sensitivity Tuning Guide

## Overview
The webcam monitoring system now uses reduced sensitivity thresholds to prevent false distractions when students naturally read questions on the left side of the screen, while still maintaining security against malpractice.

## Key Improvements

### 1. **Reduced Head-Movement Sensitivity**
The system now allows more natural head movement before flagging:

| Parameter | Old Value | New Value | Impact |
|-----------|-----------|-----------|---------|
| YAW Threshold (left/right) | ±0.22 | ±0.30 | Requires ~36% more extreme turn |
| PITCH Threshold (up/down) | -0.08 | -0.12 | Requires ~50% more extreme tilt |
| Sustained Duration | 2500ms | 3500ms | Allows 1 second more for reading |
| Quick Reset Window | N/A | 800ms | Quick glances are forgiven |

### 2. **Quick Glance Forgiveness**
- If a student's head returns to neutral within **800ms**, the deviation is forgiven
- This allows natural brief glances at questions without penalty
- Example: Glancing at questions for 500ms = **no distraction logged**
- Prevents legitimate reading from accumulating violations

### 3. **Sustained Duration Buffer**
- Only **sustained** head turns lasting 3.5+ seconds trigger logging
- Brief movements (< 3.5s) don't count against the 10-distraction limit
- Students can take time to read and think without stress

## Active Anti-Malpractice Measures (Still Enforced)

✅ **Object Detection**: Flags phones, tablets, laptops, books, remotes  
✅ **Multiple Faces**: Detects if someone else enters frame  
✅ **Sustained Looking Away**: Prolonged off-screen focus (>3.5s) still logged  
✅ **All-Activity Logging**: Every violation is logged to backend for proctor review  
✅ **Hard Limit**: 10 distractions trigger session lockout (cannot proceed)  

## How to Adjust Sensitivity Further

If you need to fine-tune sensitivity, edit [useFaceMonitor.js](frontend/src/hooks/useFaceMonitor.js) and modify the `SENSITIVITY` object:

```javascript
const SENSITIVITY = {
  YAW_LEFT: 0.30,              // Increase = less sensitive to left turns
  YAW_RIGHT: -0.30,            // Decrease = less sensitive to right turns
  PITCH_UP: -0.12,             // Decrease (more negative) = less sensitive to upward tilt
  SUSTAINED_DURATION_MS: 3500, // Increase = more time before flagging
  QUICK_RESET_WINDOW_MS: 800,  // Increase = longer forgiveness window for glances
};
```

## Testing Recommendations

1. **Test normal reading**: Turn head left for 1-2 seconds → should NOT trigger warning
2. **Test quick glances**: Turn head left for 0.5 seconds, return → should NOT trigger warning
3. **Test sustained behavior**: Look left for 4+ seconds continuously → SHOULD trigger warning
4. **Test object detection**: Hold up phone/tablet → SHOULD trigger warning immediately
5. **Test multi-face**: Have another person enter frame → SHOULD trigger warning immediately

## Monitoring & Proctor Review

All violations (even with new tolerances) are still:
- Logged with timestamp and code snapshot
- Marked with the direction/type of violation
- Available for proctor review in the backend
- Counted toward the 10-distraction limit

Proctors can review detailed logs to distinguish between:
- **Legitimate reading** (brief glances, natural movement)
- **Suspicious behavior** (prolonged looking away, phone use, etc.)

## Configuration Options (Future Enhancement)

Consider adding admin settings panel to adjust:
- Individual sensitivity thresholds per problem
- Duration before lockout (currently 10 distractions)
- Grace period windows
- Different profiles (e.g., "Relaxed" vs "Strict" proctoring)
