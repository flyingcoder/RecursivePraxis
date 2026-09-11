#!/bin/bash
# operator-tool-guard.sh - Guards against inappropriate tool usage for operators

OPERATOR="$1"
TOOL="$2"

# Define tool mappings for each operator
case "$OPERATOR" in
    Kata)
        # Kata should use bounded, focused tools
        case "$TOOL" in
            codebase_search|grep|read_file|search_replace|write)
                echo "OK: $TOOL is appropriate for $OPERATOR"
                exit 0
                ;;
            *)
                echo "WARNING: $TOOL may not be optimal for $OPERATOR (prefer bounded tools)"
                exit 0
                ;;
        esac
        ;;
    Telo)
        # Telo should use goal-directed tools
        case "$TOOL" in
            todo_write|codebase_search|read_file|grep|list_dir)
                echo "OK: $TOOL is appropriate for $OPERATOR"
                exit 0
                ;;
            *)
                echo "WARNING: $TOOL may not be optimal for $OPERATOR (prefer goal-directed tools)"
                exit 0
                ;;
        esac
        ;;
    Ortho)
        # Ortho should use validation tools
        case "$TOOL" in
            read_lints|grep|read_file|search_replace|codebase_search)
                echo "OK: $TOOL is appropriate for $OPERATOR"
                exit 0
                ;;
            *)
                echo "WARNING: $TOOL may not be optimal for $OPERATOR (prefer validation tools)"
                exit 0
                ;;
        esac
        ;;
    *)
        echo "INFO: No specific guard rules for $OPERATOR"
        exit 0
        ;;
esac
