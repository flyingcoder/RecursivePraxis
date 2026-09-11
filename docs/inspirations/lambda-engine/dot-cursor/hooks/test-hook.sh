#!/bin/bash
# test-hook.sh - Test the chat-session-init.sh hook manually

echo "🧪 Testing chat-session-init.sh hook"
echo "===================================="
echo ""

# Test 1: Test with empty prompt (should trigger mode selection)
echo "Test 1: Empty prompt (should prompt for mode selection)"
echo "--------------------------------------------------------"
echo '{"text": ""}' | .cursor/hooks/chat-session-init.sh
echo ""
echo ""

# Test 2: Test with mode 1 in prompt
echo "Test 2: Prompt with 'mode 1' (should activate Mode 1)"
echo "--------------------------------------------------------"
echo '{"text": "mode 1"}' | .cursor/hooks/chat-session-init.sh
echo ""
echo ""

# Test 3: Test with mode 2 in prompt
echo "Test 3: Prompt with 'mode 2' (should activate Mode 2)"
echo "--------------------------------------------------------"
echo '{"text": "mode 2"}' | .cursor/hooks/chat-session-init.sh
echo ""
echo ""

# Test 4: Check if timestamp reference file was created
echo "Test 4: Check timestamp reference file"
echo "--------------------------------------------------------"
if [ -f ".cursor/.timestamp-reference" ]; then
    echo "✓ Timestamp reference file exists"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CREATION_DATE=$(stat -f "%Sm" -t "%Y-%m-%d" ".cursor/.timestamp-reference")
        CREATION_TIME=$(stat -f "%Sm" -t "%H:%M:%S" ".cursor/.timestamp-reference")
    else
        CREATION_DATE=$(stat -c "%w" ".cursor/.timestamp-reference" 2>/dev/null || stat -c "%y" ".cursor/.timestamp-reference" | cut -d' ' -f1)
        CREATION_TIME=$(stat -c "%w" ".cursor/.timestamp-reference" 2>/dev/null || stat -c "%y" ".cursor/.timestamp-reference" | cut -d' ' -f2 | cut -d'.' -f1)
    fi
    echo "  Creation date: $CREATION_DATE"
    echo "  Creation time: $CREATION_TIME"
else
    echo "✗ Timestamp reference file does not exist"
fi
echo ""

# Test 5: Check if session logs directory was created
echo "Test 5: Check session logs directory"
echo "--------------------------------------------------------"
if [ -d ".cursor/sessions" ]; then
    echo "✓ Session logs directory exists"
    SESSION_COUNT=$(ls -1 .cursor/sessions/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "  Session log files: $SESSION_COUNT"
    if [ "$SESSION_COUNT" -gt 0 ]; then
        echo "  Latest session log:"
        ls -t .cursor/sessions/*.json 2>/dev/null | head -1 | xargs cat | jq '.' 2>/dev/null || echo "    (could not parse JSON)"
    fi
else
    echo "✗ Session logs directory does not exist"
fi
echo ""

# Test 6: Check lambda mode file
echo "Test 6: Check lambda mode file"
echo "--------------------------------------------------------"
if [ -f ".cursor/.lambda-mode" ]; then
    MODE=$(cat .cursor/.lambda-mode | tr -d '[:space:]')
    echo "✓ Lambda mode file exists"
    echo "  Current mode: $MODE"
else
    echo "✗ Lambda mode file does not exist"
fi
echo ""

echo "===================================="
echo "✅ Test complete!"
echo ""
echo "To test in Cursor:"
echo "1. Start a NEW chat session (Cmd/Ctrl + L, then 'New Chat')"
echo "2. Submit any prompt"
echo "3. You should see the mode selection prompt or mode confirmation"
