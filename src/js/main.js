"use strict";
let pipelines = [];

function fetchByURL(path) {
  if (!CONSTANT.TOKEN) throw Error('Access token is not set.');
  return fetch(path, {
      method: 'GET',
      headers: { 'content-type': 'application/json' }
    })
    .then(function(response) {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .catch(error => console.log(error));
}

function fetchWorkspacesByRepoId(value) {
  return fetchByURL(`${CONSTANT.API_URL}/p2/repositories/${value}/workspaces?access_token=${CONSTANT.TOKEN}`);
}

function createWorkspaceButton(data) {
  const { id, name, repositories } = data;
  const btn = document.createElement("BUTTON");
  btn.textContent = `${name} #${repositories.length} repos`;
  btn.value = id;
  btn.dataset.name = name;
  return btn;
}

function displayWorkspaces(jsonList) {
  const display = document.querySelector('#displayWorkspaces');
  while (display.firstChild) {
    display.removeChild(display.firstChild);
  }
  jsonList.forEach(data => display.appendChild(createWorkspaceButton(data)))
}

function getWorkspaces() {
  fetchWorkspacesByRepoId(CONSTANT.ALPINE_MOBILE).then(displayWorkspaces);
}

function fetchBoardByWorkspaceIdAndRepoId(workspaceId, repoId) {
  return fetchByURL(`${CONSTANT.API_URL}/p2/workspaces/${workspaceId}/repositories/${repoId}/board?access_token=${CONSTANT.TOKEN}`);
}

function createPipelineButton(data) {
  const { id, name, issues } = data;
  const btn = document.createElement("BUTTON");
  btn.textContent = `${name} (${issues.length})`;
  btn.value = id;
  btn.dataset.name = name;
  btn.onclick = displayPipeline;
  return btn;
}

function displayBoard(jsonData, name) {
  pipelines = jsonData.pipelines;
  const display = document.querySelector('#displayBoard');
  display.previousElementSibling.textContent = `Board ${name}`;
  while (display.firstChild) {
    display.removeChild(display.firstChild);
  }
  pipelines.forEach(data => display.appendChild(createPipelineButton(data)));
}

function getBoard(event) {
  const { value, dataset } = event.target;
  if (value) fetchBoardByWorkspaceIdAndRepoId(value, CONSTANT.ALPINE_MOBILE)
    .then(jsonData => displayBoard(jsonData, dataset.name));
}
document.querySelector('#displayWorkspaces').onclick = getBoard;

function createIssueButton(data) {
  const { is_epic, issue_number, position } = data;
  const btn = document.createElement("BUTTON");
  btn.textContent = `${is_epic? 'Epic ': ''}${issue_number}`;
  btn.value = issue_number;
  btn.dataset.position = position;
  btn.onclick = function(event) {
    const { value } = event.target;
    if (value) {
      document.querySelector('#issueId').value = value;
      getIssue();
    }
  };
  return btn;
}

function displayPipeline(event) {
  const { value, dataset } = event.target;
  if (value) {
    const pipeline = pipelines.find(pipeline => pipeline.id === value) || {};
    const display = document.querySelector('#displayPipeline');
    display.previousElementSibling.textContent = `Pipeline ${dataset.name}`;
    while (display.firstChild) {
      display.removeChild(display.firstChild);
    }
    pipeline.issues.forEach(data => display.appendChild(createIssueButton(data)));
  }
}

function fetchIssueById(value) {
  return fetchByURL(`${CONSTANT.API_URL}/p1/repositories/${CONSTANT.ALPINE_MOBILE}/issues/${value}?access_token=${CONSTANT.TOKEN}`);
}

function displayIssue(jsonData) {
  const { estimate, is_epic, pipeline } = jsonData;
  const text = `
		estimate: ${estimate && estimate.value || ' '},
		epic: ${is_epic},
		status: ${pipeline.name}
		`;
  document.querySelector('#displayIssue').textContent = text;
}

function getIssue() {
  const issueInput = document.getElementById('issueId');
  if (issueInput.value && issueInput.checkValidity()) {
    fetchIssueById(issueInput.value).then(displayIssue);
    fetchIssueEventsById(issueInput.value).then(displayIssueEvents);
  }
  setIssueLink(issueInput.value);
}

function fetchIssueEventsById(value) {
  return fetchByURL(`${CONSTANT.API_URL}/p1/repositories/${CONSTANT.ALPINE_MOBILE}/issues/${value}/events?access_token=${CONSTANT.TOKEN}`);
}

function fetchUserById(value) {
  return fetchByURL(`https://api.github.com/user/${value}`);
}

function displayTransferEvent(transferEvent, users, display) {
  const { from_pipeline, to_pipeline, user_id, created_at } = transferEvent;
  const user = users.find(user => user.id === user_id);
  const date = new Date(created_at);
  const duration = new Date() - date;
  const template = document.querySelector('#my-event');
  const clone = document.importNode(template.content, true);
  const spanlist = clone.querySelectorAll('span');
  spanlist[0].textContent = `${from_pipeline && from_pipeline.name || ' '} -> ${to_pipeline && to_pipeline.name || ' '}`;
  spanlist[1].textContent = ` by ${user.login}`;
  spanlist[1].title = user.name;
  spanlist[2].textContent = ` on ${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  spanlist[2].title = `${Math.round(duration/(1000*60*60*24))} days ${Math.round(duration/(1000*60*60)) % 24} hours ago`;
  display.appendChild(clone);
}

function displayIssueEvents(jsonData) {
  const display = document.querySelector('#displayIssueEvents');
  const userIds = [...new Set(jsonData.map(item => item.user_id))];
  Promise.all(userIds.map(userId => fetchUserById(userId)))
    .then(users => {
      while (display.firstChild) {
        display.removeChild(display.firstChild);
      }
      jsonData.filter(event => event.type === "transferIssue").forEach(transferEvent => displayTransferEvent(transferEvent, users, display));
    })
}

function setIssueLink(value) {
  const link = document.querySelector('#displayIssue').previousElementSibling;
  if (value) {
    link.href = `https://github.com/Liquidframeworks/alpine-mobile/issues/${value}`;
    link.className = '';
  } else link.className = 'hidden';
}
