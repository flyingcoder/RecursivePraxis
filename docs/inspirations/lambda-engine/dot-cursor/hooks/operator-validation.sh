#!/bin/bash
# operator-validation.sh - Validates operator sequences before execution

SEQUENCE="$1"
MAX_META=2

# Check for Meta loop (max 2 consecutive)
meta_count=0
for op in $SEQUENCE; do
    if [ "$op" = "Meta" ]; then
        meta_count=$((meta_count + 1))
        if [ $meta_count -gt $MAX_META ]; then
            echo "ERROR: Meta operator used more than $MAX_META consecutive times"
            exit 1
        fi
    else
        meta_count=0
    fi
done

# Check forbidden transitions
prev_op=""
for op in $SEQUENCE; do
    if [ "$prev_op" = "Meta" ] && [ "$op" = "Non" ]; then
        echo "ERROR: FORBIDDEN: Non after Meta"
        exit 1
    fi
    if [ "$prev_op" = "Non" ] && [ "$op" = "Para" ]; then
        echo "ERROR: FORBIDDEN: Para after Non"
        exit 1
    fi
    prev_op="$op"
done

# Check Ana at end
last_op=$(echo $SEQUENCE | awk '{print $NF}')
if [ "$last_op" = "Ana" ]; then
    echo "ERROR: FORBIDDEN: Ana at sequence end"
    exit 1
fi

echo "Operator sequence validated: $SEQUENCE"
exit 0
