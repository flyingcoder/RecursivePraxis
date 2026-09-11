#!/bin/bash
# operator-feedback-loop.sh - Collects feedback on operator effectiveness

OPERATOR="$1"
SEQUENCE="$2"
OUTCOME="$3"
FEEDBACK_FILE=".cursor/hooks/operator-feedback.json"

# Create feedback entry
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FEEDBACK_ENTRY=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "operator": "$OPERATOR",
  "sequence": "$SEQUENCE",
  "outcome": "$OUTCOME"
}
EOF
)

# Append to feedback file
mkdir -p "$(dirname "$FEEDBACK_FILE")"
if [ -f "$FEEDBACK_FILE" ]; then
    # Append to existing array
    sed -i '' '$s/]$/,
'"$FEEDBACK_ENTRY"'
]/' "$FEEDBACK_FILE" 2>/dev/null ||     echo "[$FEEDBACK_ENTRY]" > "$FEEDBACK_FILE"
else
    echo "[$FEEDBACK_ENTRY]" > "$FEEDBACK_FILE"
fi

echo "Feedback recorded for $OPERATOR"
