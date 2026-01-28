import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import ws from 'k6/ws';

// Custom metrics
const joinSuccess = new Counter('join_success');
const joinFailed = new Counter('join_failed');
const roomFound = new Counter('room_found');
const answersSubmitted = new Counter('answers_submitted');
const connectionTime = new Trend('connection_time');

// Test configuration - 150 concurrent users
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },   // Ramp up to 50 users
        { duration: '15s', target: 150 },  // Ramp up to 150 users  
        { duration: '120s', target: 150 }, // Stay at 150 users for 2 minutes (game time)
        { duration: '10s', target: 0 },    // Ramp down
      ],
    },
  },
};

const BASE_URL = 'https://competition.kafaat.site';
const INVITE_CODE = '000000';

// Generate unique client ID (like uuid)
function generateClientId() {
  var chars = '0123456789abcdef';
  var uuid = '';
  for (var i = 0; i < 32; i++) {
    uuid += chars[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      uuid += '-';
    }
  }
  return uuid;
}

export default function () {
  var clientId = generateClientId();
  var username = 'Player_' + __VU + '_' + __ITER;
  
  // Socket.IO handshake
  var handshakeUrl = BASE_URL + '/socket.io/?EIO=4&transport=polling&t=' + Date.now();
  
  var handshakeRes = http.get(handshakeUrl);
  
  if (handshakeRes.status !== 200) {
    console.log('[' + username + '] Handshake failed: ' + handshakeRes.status);
    joinFailed.add(1);
    return;
  }
  
  // Parse session ID
  var sid = '';
  var body = handshakeRes.body;
  if (body && body.indexOf('sid') > -1) {
    try {
      var jsonStr = body.substring(body.indexOf('{'));
      var closeIdx = jsonStr.indexOf('}') + 1;
      jsonStr = jsonStr.substring(0, closeIdx);
      var data = JSON.parse(jsonStr);
      sid = data.sid;
    } catch (e) {
      console.log('[' + username + '] Parse error');
      joinFailed.add(1);
      return;
    }
  }
  
  if (!sid) {
    joinFailed.add(1);
    return;
  }
  
  // Send auth via polling
  var authPayload = '40{"clientId":"' + clientId + '"}';
  var postUrl = BASE_URL + '/socket.io/?EIO=4&transport=polling&t=' + Date.now() + '&sid=' + sid;
  
  http.post(postUrl, authPayload, {
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
  });
  
  sleep(0.2);
  
  var startTime = Date.now();
  
  // Connect via WebSocket
  var wsUrl = 'wss://competition.kafaat.site/socket.io/?EIO=4&transport=websocket&sid=' + sid;
  
  var res = ws.connect(wsUrl, null, function (socket) {
    var gameId = null;
    var joined = false;
    var totalAnswers = 4; // Default number of answers
    
    socket.on('open', function () {
      connectionTime.add(Date.now() - startTime);
      socket.send('2probe');
    });
    
    socket.on('message', function (data) {
      // Ping -> Pong
      if (data === '2') {
        socket.send('3');
        return;
      }
      
      // Upgrade complete
      if (data === '3probe') {
        socket.send('5');
        sleep(0.3);
        
        // Join room
        var joinMsg = '42["player:join","' + INVITE_CODE + '"]';
        socket.send(joinMsg);
        console.log('[' + username + '] Joining...');
        return;
      }
      
      // Handle Socket.IO events
      if (data.substring(0, 2) === '42') {
        try {
          var eventData = JSON.parse(data.substring(2));
          var eventName = eventData[0];
          var payload = eventData[1];
          
          // Room found - proceed to login
          if (eventName === 'game:successRoom') {
            gameId = payload;
            roomFound.add(1);
            console.log('[' + username + '] Room OK');
            
            var loginMsg = '42["player:login",{"gameId":"' + gameId + '","data":{"username":"' + username + '"}}]';
            socket.send(loginMsg);
          }
          
          // Successfully joined
          if (eventName === 'game:successJoin') {
            joined = true;
            joinSuccess.add(1);
            console.log('[' + username + '] ✓ JOINED!');
          }
          
          // Error message
          if (eventName === 'game:errorMessage') {
            console.log('[' + username + '] Error: ' + payload);
            if (!joined) joinFailed.add(1);
          }
          
          // Game status update
          if (eventName === 'game:status') {
            var statusName = payload.name;
            var statusData = payload.data;
            
            console.log('[' + username + '] Status: ' + statusName);
            
            // When it's time to select an answer
            if (statusName === 'SELECT_ANSWER') {
              // Get number of available answers
              if (statusData && statusData.answers) {
                totalAnswers = statusData.answers.length;
              }
              
              // Random delay to simulate thinking (1-5 seconds)
              var thinkTime = 1 + Math.random() * 4;
              sleep(thinkTime);
              
              // Select random answer (0 to totalAnswers-1)
              var selectedAnswer = Math.floor(Math.random() * totalAnswers);
              
              // Send answer
              var answerMsg = '42["player:selectedAnswer",{"gameId":"' + gameId + '","data":{"answerKey":' + selectedAnswer + '}}]';
              socket.send(answerMsg);
              answersSubmitted.add(1);
              console.log('[' + username + '] 📝 Selected answer: ' + selectedAnswer);
            }
            
            // When showing results
            if (statusName === 'SHOW_RESULT') {
              if (statusData && statusData.correct) {
                console.log('[' + username + '] ✓ Correct! +' + statusData.points + ' points');
              } else {
                console.log('[' + username + '] ✗ Wrong answer');
              }
            }
            
            // Game finished
            if (statusName === 'FINISHED') {
              console.log('[' + username + '] 🏆 Game finished!');
            }
          }
          
          // Player count update
          if (eventName === 'game:totalPlayers') {
            console.log('[' + username + '] Players: ' + payload);
          }
          
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    
    socket.on('error', function (e) {
      console.log('[' + username + '] Error: ' + e);
      if (!joined) joinFailed.add(1);
    });
    
    socket.on('close', function () {
      console.log('[' + username + '] Disconnected');
      if (!joined && !gameId) {
        joinFailed.add(1);
      }
    });
    
    // Stay connected for entire test (3 minutes)
    socket.setTimeout(function () {
      socket.close();
    }, 180000);
  });
  
  check(res, {
    'WS connected': function(r) { return r && r.status === 101; },
  });
}

export function handleSummary(data) {
  var m = data.metrics;
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║         K6 LOAD TEST RESULTS               ║');
  console.log('╠════════════════════════════════════════════╣');
  
  var success = m.join_success ? m.join_success.values.count : 0;
  var failed = m.join_failed ? m.join_failed.values.count : 0;
  var rooms = m.room_found ? m.room_found.values.count : 0;
  var answers = m.answers_submitted ? m.answers_submitted.values.count : 0;
  
  console.log('║  ✓ Successful Joins:    ' + success);
  console.log('║  🏠 Rooms Found:         ' + rooms);
  console.log('║  📝 Answers Submitted:   ' + answers);
  console.log('║  ✗ Failed:              ' + failed);
  
  if (m.connection_time && m.connection_time.values) {
    console.log('║  ⏱ Avg Connection Time: ' + Math.round(m.connection_time.values.avg) + 'ms');
  }
  
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  
  return {};
}
