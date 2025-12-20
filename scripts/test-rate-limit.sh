#!/bin/bash

# Rate Limit Testing Script
# Usage: ./test-rate-limit.sh [base_url]

BASE_URL="${1:-https://chat.myeternalguide.com}"

echo "=========================================="
echo "  Rate Limit Test Suite"
echo "  Target: $BASE_URL"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_rate_limit() {
    local endpoint=$1
    local requests=$2
    local expected_block_after=$3
    local description=$4
    
    echo -e "${YELLOW}Test: $description${NC}"
    echo "Endpoint: $endpoint"
    echo "Sending $requests requests..."
    echo ""
    
    local passed=0
    local blocked=0
    
    for i in $(seq 1 $requests); do
        status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}")
        
        if [ "$status" == "429" ]; then
            blocked=$((blocked + 1))
            echo -e "  Request $i: ${RED}$status (Rate Limited)${NC}"
        else
            passed=$((passed + 1))
            echo -e "  Request $i: ${GREEN}$status (Passed)${NC}"
        fi
    done
    
    echo ""
    echo "Results: $passed passed, $blocked blocked"
    
    if [ $blocked -gt 0 ]; then
        echo -e "${GREEN}✅ Rate limiting is ACTIVE${NC}"
    else
        echo -e "${RED}❌ Rate limiting may NOT be working${NC}"
    fi
    
    echo ""
    echo "------------------------------------------"
    echo ""
}

# Test 1: Chat API (strict - 10r/m, burst=3)
test_rate_limit "/api/chat" 10 4 "Chat API Rate Limit (10r/m, burst=3)"

# Wait for rate limit to reset partially
echo "Waiting 10 seconds before next test..."
sleep 10

# Test 2: General API (30r/m, burst=10)
test_rate_limit "/api/subscription-tier" 20 11 "General API Rate Limit (30r/m, burst=10)"

echo ""
echo "=========================================="
echo "  Tests Complete!"
echo "=========================================="

