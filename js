// User data object
let userData = {
  mood: null,
  interactions: null,
  journal: null,
  sentiment: null,
  dceChoices: [],
  gazeData: [],
  riskScore: null,
  suggestions: []
};

// DCE Questions
const dceQuestions = [
  {
    id: 1,
    text: "Would you prefer a weekly in-person group activity or a monthly virtual individual activity?",
    options: [
      { text: "Weekly in-person group activity", value: "group-inperson" },
      { text: "Monthly virtual individual activity", value: "individual-virtual" }
    ]
  },
  {
    id: 2,
    text: "Would you prefer a weekly virtual group activity or a monthly in-person individual activity?",
    options: [
      { text: "Weekly virtual group activity", value: "group-virtual" },
      { text: "Monthly in-person individual activity", value: "individual-inperson" }
    ]
  },
  {
    id: 3,
    text: "Would you prefer a monthly in-person group activity or a weekly virtual individual activity?",
    options: [
      { text: "Monthly in-person group activity", value: "group-inperson" },
      { text: "Weekly virtual individual activity", value: "individual-virtual" }
    ]
  }
];

let currentQuestion = 0;

// Image regions for eye-tracking
let imageRegions = [];

// Initialize WebGazer
webgazer.setGazeListener(function(data, elapsedTime) {
  if (data == null || currentQuestion !== -1) return;
  const x = data.x;
  const y = data.y;
  imageRegions.forEach(region => {
    if (x >= region.left && x <= region.right && y >= region.top && y <= region.bottom) {
      region.count++;
    }
  });
}).begin();
webgazer.showPredictionPoints(false);

// Text-to-Speech
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-AU';
  speechSynthesis.speak(utterance);
}

// Calculate Loneliness Risk
function calculateRisk() {
  let moodScore = { happy: 0, neutral: 1, sad: 2 }[userData.mood];
  let interactionScore = userData.interactions >= 5 ? 0 : userData.interactions >= 2 ? 1 : 2;
  let sentimentScore = userData.sentiment > 0 ? 0 : userData.sentiment < 0 ? 2 : 1;
  let totalScore = moodScore + interactionScore + sentimentScore;
  if (totalScore <= 2) return 'Low';
  if (totalScore <= 4) return 'Medium';
  return 'High';
}

// Generate Suggestions
function generateSuggestions() {
  const risk = userData.riskScore;
  const prefersGroup = userData.dceChoices.filter(c => c.includes('group')).length > userData.dceChoices.filter(c => c.includes('individual')).length;
  const prefersInPerson = userData.dceChoices.filter(c => c.includes('inperson')).length > userData.dceChoices.filter(c => c.includes('virtual')).length;
  const mostLookedAt = imageRegions.reduce((max, region) => region.count > max.count ? region : max, imageRegions[0]).type;

  if (risk === 'High') {
    if (prefersGroup && prefersInPerson && mostLookedAt.includes('group-inperson')) {
      userData.suggestions.push('Join a local seniors club for weekly in-person activities.');
    } else if (prefersGroup) {
      userData.suggestions.push('Participate in virtual group sessions or online community events.');
    } else if (prefersInPerson) {
      userData.suggestions.push('Arrange regular in-person visits with friends or volunteers.');
    } else {
      userData.suggestions.push('Schedule video calls with family or friends.');
    }
  } else if (risk === 'Medium') {
    if (prefersGroup) {
      userData.suggestions.push('Try attending a group activity, either in-person or virtually.');
    } else {
      userData.suggestions.push('Connect with a friend or volunteer for a chat.');
    }
  } else {
    userData.suggestions.push('Keep up your current social activities.');
  }
}

// Show DCE Question
function showQuestion() {
  const question = dceQuestions[currentQuestion];
  const questionsDiv = document.getElementById('questions');
  questionsDiv.innerHTML = `
    <div class="question">
      <p>${question.text} <button type="button" class="speak-btn btn btn-secondary" onclick="speak('${question.text}')">Speak</button></p>
      ${question.options.map(opt => `
        <button class="option btn btn-outline-primary" data-choice="${opt.value}">${opt.text}</button>
      `).join('')}
    </div>
  `;
  document.querySelectorAll('.option').forEach(button => {
    button.addEventListener('click', () => {
      userData.dceChoices.push(button.dataset.choice);
      currentQuestion++;
      if (currentQuestion < dceQuestions.length) {
        showQuestion();
      } else {
        document.getElementById('dce').style.display = 'none';
        document.getElementById('engagement').style.display = 'block';
        // Initialize image regions
        imageRegions = [];
        document.querySelectorAll('#images img').forEach(img => {
          const rect = img.getBoundingClientRect();
          imageRegions.push({
            type: img.dataset.type,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            count: 0
          });
        });
        // Start engagement timer
        setTimeout(() => {
          document.getElementById('engagementDone').style.display = 'block';
        }, 30000);
      }
    });
  });
}

// Event Listeners
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('calibration').style.display = 'block';
  // Calibration setup
  const pointsDiv = document.getElementById('calibrationPoints');
  const points = [
    { x: 50, y: 50 }, { x: 250, y: 50 }, { x: 50, y: 250 }, { x: 250, y: 250 }
  ];
  points.forEach((point, index) => {
    const pointEl = document.createElement('div');
    pointEl.style.position = 'absolute';
    pointEl.style.left = `${point.x}px`;
    pointEl.style.top = `${point.y}px`;
    pointEl.style.width = '20px';
    pointEl.style.height = '20px';
    pointEl.style.background = 'red';
    pointEl.style.borderRadius = '50%';
    pointEl.style.cursor = 'pointer';
    pointEl.addEventListener('click', () => {
      webgazer.recordScreenPosition(point.x, point.y);
      pointEl.style.display = 'none';
      if (index === points.length - 1) {
        document.getElementById('calibrateBtn').disabled = false;
      }
    });
    pointsDiv.appendChild(pointEl);
  });
});

document.getElementById('calibrateBtn').addEventListener('click', () => {
  webgazer.showPredictionPoints(false);
  document.getElementById('calibration').style.display = 'none';
  document.getElementById('assessment').style.display = 'block';
});

document.getElementById('assessmentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  userData.mood = document.getElementById('mood').value;
  userData.interactions = parseInt(document.getElementById('interactions').value);
  userData.journal = document.getElementById('journal').value;
  if (userData.journal) {
    const sentiment = new Sentiment();
    const result = sentiment.analyze(userData.journal);
    userData.sentiment = result.score;
  } else {
    userData.sentiment = 0;
  }
  document.getElementById('assessment').style.display = 'none';
  document.getElementById('dce').style.display = 'block';
  showQuestion();
});

document.getElementById('engagementDone').addEventListener('click', () => {
  webgazer.pause();
  document.getElementById('engagement').style.display = 'none';
  document.getElementById('results').style.display = 'block';
  userData.riskScore = calculateRisk();
  generateSuggestions();
  document.getElementById('riskLevel').textContent = userData.riskScore;
  const suggestionsList = document.getElementById('suggestionsList');
  userData.suggestions.forEach(suggestion => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = suggestion;
    suggestionsList.appendChild(li);
  });
});
