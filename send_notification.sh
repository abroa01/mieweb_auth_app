#!/bin/bash

PUSHGATEWAY="https://aabrol-mieauth.dev.bluehive.com"
RELYINGPARTY="aa"
#USERID=

curl -X POST "$PUSHGATEWAY/send-notification" \
-H "Content-Type: application/json" \
-d '{
  "username": "'"${RELYINGPARTY}"'",
  "title": "MIE Sudo Security Alert",
  "body": "Please review and respond to your pending MIE request in the app",
  "timeout": "",
  "restriction": "",
  "deviceType": "primary",
  "metaData": "server name, ip, source, etc",
  "actions": [
    {
      "icon": "approve",
      "title": "Approve",
      "callback": "approve"
    },
    {
      "icon": "reject",
      "title": "Reject",
      "callback": "reject"
    }
  ]
}'
