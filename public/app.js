const form = document.querySelector('#testForm');
const projectForm = document.querySelector('#projectForm');
const projectList = document.querySelector('#projectList');
const projectSearch = document.querySelector('#projectSearch');
const projectCount = document.querySelector('#projectCount');
const projectSelect = document.querySelector('#projectSelect');
const projectSelectedMeta = document.querySelector('#projectSelectedMeta');
const projectId = document.querySelector('#projectId');
const projectName = document.querySelector('#projectName');
const projectDescription = document.querySelector('#projectDescription');
const projectBaseUrl = document.querySelector('#projectBaseUrl');
const projectEnvironment = document.querySelector('#projectEnvironment');
const newProjectButton = document.querySelector('#newProjectButton');
const deleteProjectButton = document.querySelector('#deleteProjectButton');
const suiteForm = document.querySelector('#suiteForm');
const suiteList = document.querySelector('#suiteList');
const suiteSearch = document.querySelector('#suiteSearch');
const suiteCount = document.querySelector('#suiteCount');
const suiteSelect = document.querySelector('#suiteSelect');
const suiteSelectedMeta = document.querySelector('#suiteSelectedMeta');
const suiteId = document.querySelector('#suiteId');
const suiteName = document.querySelector('#suiteName');
const suiteType = document.querySelector('#suiteType');
const suiteTypeMenu = document.querySelector('#suiteTypeMenu');
const suiteConfigPanel = document.querySelector('#suiteConfigPanel');
const suiteDescription = document.querySelector('#suiteDescription');
const suiteEnabled = document.querySelector('#suiteEnabled');
const newSuiteButton = document.querySelector('#newSuiteButton');
const deleteSuiteButton = document.querySelector('#deleteSuiteButton');
const caseForm = document.querySelector('#caseForm');
const caseLibraryList = document.querySelector('#caseLibraryList');
const caseSearch = document.querySelector('#caseSearch');
const caseCount = document.querySelector('#caseCount');
const caseId = document.querySelector('#caseId');
const caseCode = document.querySelector('#caseCode');
const caseName = document.querySelector('#caseName');
const caseDescription = document.querySelector('#caseDescription');
const casePriority = document.querySelector('#casePriority');
const caseEnabled = document.querySelector('#caseEnabled');
const caseExpectedResult = document.querySelector('#caseExpectedResult');
const newCaseButton = document.querySelector('#newCaseButton');
const deleteCaseButton = document.querySelector('#deleteCaseButton');
const targetForm = document.querySelector('#targetForm');
const targetList = document.querySelector('#targetList');
const targetSearch = document.querySelector('#targetSearch');
const targetCount = document.querySelector('#targetCount');
const targetSelect = document.querySelector('#targetSelect');
const targetSelectedMeta = document.querySelector('#targetSelectedMeta');
const targetId = document.querySelector('#targetId');
const targetName = document.querySelector('#targetName');
const targetType = document.querySelector('#targetType');
const targetUrl = document.querySelector('#targetUrl');
const targetLocalPath = document.querySelector('#targetLocalPath');
const targetConfig = document.querySelector('#targetConfig');
const targetEnabled = document.querySelector('#targetEnabled');
const targetUrlField = document.querySelector('.target-url-field');
const targetPathField = document.querySelector('.target-path-field');
const newTargetButton = document.querySelector('#newTargetButton');
const deleteTargetButton = document.querySelector('#deleteTargetButton');
const siteUrl = document.querySelector('#siteUrl');
const runButton = document.querySelector('#runButton');
const generateButton = document.querySelector('#generateButton');
const refreshButton = document.querySelector('#refreshButton');
const systemStatus = document.querySelector('#systemStatus');
const authMode = document.querySelector('#authMode');
const authFields = document.querySelector('#authFields');
const loginUrl = document.querySelector('#loginUrl');
const authUsername = document.querySelector('#authUsername');
const authPassword = document.querySelector('#authPassword');
const successSelector = document.querySelector('#successSelector');
const usernameSelector = document.querySelector('#usernameSelector');
const passwordSelector = document.querySelector('#passwordSelector');
const submitSelector = document.querySelector('#submitSelector');
const aiRequest = document.querySelector('#aiRequest');
const generatedPlan = document.querySelector('#generatedPlan');
const generatedCode = document.querySelector('#generatedCode');
const generatedPath = document.querySelector('#generatedPath');
const toggleCodeButton = document.querySelector('#toggleCodeButton');
const codePanel = document.querySelector('#codePanel');
const historyList = document.querySelector('#historyList');
const historyCount = document.querySelector('#historyCount');
const historyPagination = document.querySelector('#historyPagination');
const prevPageButton = document.querySelector('#prevPageButton');
const nextPageButton = document.querySelector('#nextPageButton');
const pageInfo = document.querySelector('#pageInfo');
const progressPanel = document.querySelector('#progressPanel');
const progressBar = document.querySelector('#progressBar');
const stepsList = document.querySelector('#stepsList');
const detailOverlay = document.querySelector('#detailOverlay');
const closeDetailButton = document.querySelector('#closeDetailButton');
const detailTitle = document.querySelector('#detailTitle');
const detailSummary = document.querySelector('#detailSummary');
const caseList = document.querySelector('#caseList');
const factOverlay = document.querySelector('#factOverlay');
const closeFactButton = document.querySelector('#closeFactButton');
const factTitle = document.querySelector('#factTitle');
const factBody = document.querySelector('#factBody');
const latestTime = document.querySelector('#latestTime');
const metricTotal = document.querySelector('#metricTotal');
const metricPassed = document.querySelector('#metricPassed');
const metricFailed = document.querySelector('#metricFailed');
const metricDuration = document.querySelector('#metricDuration');
const languageSwitchers = document.querySelectorAll('.language-switcher');
const pageLinks = document.querySelectorAll('[data-page-link]');
const pageSections = document.querySelectorAll('[data-page-section]');
let defaultButtonLabels = {
  run: runButton.textContent,
  generate: generateButton.textContent,
  refresh: refreshButton.textContent,
};
const i18nState = {
  lang: localStorage.getItem('passmark-language') || 'en',
  messages: {},
};
const historyState = {
  runs: [],
  page: 1,
  pageSize: 5,
};
const projectState = {
  projects: [],
  selectedId: '',
  query: '',
};
const suiteState = {
  suites: [],
  selectedId: '',
  query: '',
};
const caseState = {
  cases: [],
  selectedId: '',
  query: '',
};
const targetState = {
  targets: [],
  selectedId: '',
  query: '',
};
const pageState = {
  current: 'run',
};
const suiteTypeConfig = {
  'seo-basic': {
    labelKey: 'suite.seoBasic.label',
    hintKey: 'suite.seoBasic.hint',
    fields: [
      ['checkTitle', 'suite.field.checkTitle', 'checkbox', true],
      ['checkMetaDescription', 'suite.field.checkMetaDescription', 'checkbox', true],
      ['checkCanonical', 'suite.field.checkCanonical', 'checkbox', true],
      ['checkH1', 'suite.field.checkH1', 'checkbox', true],
    ],
  },
  'seo-technical': {
    labelKey: 'suite.seoTechnical.label',
    hintKey: 'suite.seoTechnical.hint',
    fields: [
      ['robotsPath', 'suite.field.robotsPath', 'text', '/robots.txt'],
      ['sitemapPath', 'suite.field.sitemapPath', 'text', '/sitemap.xml'],
      ['checkSchema', 'suite.field.checkSchema', 'checkbox', true],
      ['checkOpenGraph', 'suite.field.checkOpenGraph', 'checkbox', true],
    ],
  },
  'broken-links': {
    labelKey: 'suite.brokenLinks.label',
    hintKey: 'suite.brokenLinks.hint',
    fields: [
      ['maxLinks', 'suite.field.maxLinks', 'number', 50],
      ['sameDomainOnly', 'suite.field.sameDomainOnly', 'checkbox', true],
    ],
  },
  'image-alt': {
    labelKey: 'suite.imageAlt.label',
    hintKey: 'suite.imageAlt.hint',
    fields: [
      ['includeLazyImages', 'suite.field.includeLazyImages', 'checkbox', true],
      ['ignoreDecorative', 'suite.field.ignoreDecorative', 'checkbox', true],
    ],
  },
  accessibility: {
    labelKey: 'suite.accessibility.label',
    hintKey: 'suite.accessibility.hint',
    fields: [
      ['checkLabels', 'suite.field.checkLabels', 'checkbox', true],
      ['checkHeadings', 'suite.field.checkHeadings', 'checkbox', true],
      ['checkKeyboard', 'suite.field.checkKeyboard', 'checkbox', false],
    ],
  },
  custom: {
    labelKey: 'suite.custom.label',
    hintKey: 'suite.custom.hint',
    fields: [
      ['instruction', 'suite.field.instruction', 'textarea', ''],
    ],
  },
};

stepsList.querySelectorAll('li').forEach((step, index) => {
  step.dataset.order = String(index);
});

function interpolate(template, values = {}) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function t(key, fallback = key, values = {}) {
  return interpolate(i18nState.messages[key] || fallback, values);
}

async function loadTranslations(lang) {
  try {
    const response = await fetch(`/i18n/${lang}.json`);

    if (!response.ok) {
      throw new Error(`Missing language file: ${lang}`);
    }

    i18nState.lang = lang;
    i18nState.messages = await response.json();
    localStorage.setItem('passmark-language', lang);
  } catch {
    i18nState.lang = 'en';
    const response = await fetch('/i18n/en.json');
    i18nState.messages = response.ok ? await response.json() : {};
  }
}

function applyTranslations() {
  document.documentElement.lang = i18nState.lang;

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n, element.textContent);
  }

  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = t(element.dataset.i18nPlaceholder, element.placeholder);
  }

  for (const switcher of languageSwitchers) {
    for (const button of switcher.querySelectorAll('[data-lang]')) {
      button.classList.toggle('active', button.dataset.lang === i18nState.lang);
    }
  }

  for (const button of suiteTypeMenu.querySelectorAll('button[data-suite-type]')) {
    const typeInfo = suiteTypeConfig[button.dataset.suiteType];
    button.textContent = t(typeInfo?.labelKey, button.textContent);
  }

  defaultButtonLabels = {
    run: t('run.runTest', 'Run test'),
    generate: t('run.generate', 'Generate only'),
    refresh: t('run.refresh', 'Refresh history'),
  };
}

function refreshLocalizedUi() {
  applyTranslations();
  renderProjects();
  renderTargets();
  renderSuites();
  renderCases();
  renderHistory();
  renderSuiteConfig(readSuiteConfig());

  if (codePanel.hidden) {
    toggleCodeButton.textContent = t('flow.showCode', 'Show code');
  } else {
    toggleCodeButton.textContent = t('flow.hideCode', 'Hide code');
  }

  if (!systemStatus.classList.contains('busy')) {
    setBusy(false, t('app.status.ready', 'Ready'));
  }
}

function showPage(page, options = {}) {
  const nextPage = ['run', 'projects', 'suites', 'reports', 'settings'].includes(page) ? page : 'run';
  pageState.current = nextPage;
  document.body.dataset.page = nextPage;

  for (const section of pageSections) {
    const pages = (section.dataset.pageSection || '').split(/\s+/);
    section.hidden = !pages.includes(nextPage);
  }

  for (const link of pageLinks) {
    link.classList.toggle('active', link.dataset.pageLink === nextPage);
  }

  if (nextPage === 'reports') {
    loadRuns().catch((error) => {
      generatedCode.value = error.message;
      setStatus(t('common.error', 'Error'), 'failed');
    });
  }

  if (options.updateHash !== false) {
    history.replaceState(null, '', `#${nextPage}`);
  }
}

function setBusy(isBusy, label = t('app.status.ready', 'Ready')) {
  runButton.disabled = isBusy;
  generateButton.disabled = isBusy;
  refreshButton.disabled = isBusy;
  systemStatus.textContent = label;
  systemStatus.className = `status-pill${isBusy ? ' busy' : ''}`;

  if (!isBusy) {
    runButton.textContent = defaultButtonLabels.run;
    generateButton.textContent = defaultButtonLabels.generate;
    refreshButton.textContent = defaultButtonLabels.refresh;
  }
}

function setStatus(label, state) {
  systemStatus.textContent = label;
  systemStatus.className = `status-pill ${state}`;
}

function setProgress(activeStep, percent) {
  const activeElement = stepsList.querySelector(`[data-step="${activeStep}"]`);
  const activeOrder = Number(activeElement?.dataset.order || 0);

  progressBar.style.width = `${percent}%`;

  for (const step of stepsList.querySelectorAll('li')) {
    const order = Number(step.dataset.order || 0);
    step.classList.toggle('active', step === activeElement);
    step.classList.toggle('done', order < activeOrder);
  }
}

function resetProgress() {
  progressBar.style.width = '0%';

  for (const step of stepsList.querySelectorAll('li')) {
    step.classList.remove('active', 'done');
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function formatDuration(ms) {
  if (!ms) {
    return '0s';
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function statusText(status) {
  if (status === 'queued') {
    return t('common.queued', 'Queued');
  }

  if (status === 'running') {
    return t('common.running', 'Running');
  }

  if (status === 'passed') {
    return t('common.passed', 'Passed');
  }

  if (status === 'failed') {
    return t('common.failed', 'Failed');
  }

  if (status === 'error') {
    return t('common.error', 'Error');
  }

  if (status === 'cancelled') {
    return t('common.cancelled', 'Cancelled');
  }

  return status || '';
}

function isRunDone(run) {
  return ['passed', 'failed', 'cancelled'].includes(run?.status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function collectAuth() {
  if (authMode.value !== 'password') {
    return { mode: 'none' };
  }

  return {
    mode: 'password',
    loginUrl: loginUrl.value,
    username: authUsername.value,
    password: authPassword.value,
    successSelector: successSelector.value,
    usernameSelector: usernameSelector.value,
    passwordSelector: passwordSelector.value,
    submitSelector: submitSelector.value,
  };
}

function updateAuthFields() {
  authFields.hidden = authMode.value !== 'password';
}

function getSelectedProject() {
  return projectState.projects.find((project) => project.id === projectState.selectedId);
}

function getSelectedSuite() {
  return suiteState.suites.find((suite) => suite.id === suiteState.selectedId);
}

function getSelectedCase() {
  return caseState.cases.find((testCase) => testCase.id === caseState.selectedId);
}

function getSelectedTarget() {
  return targetState.targets.find((target) => target.id === targetState.selectedId);
}

function targetTypeLabel(type) {
  return t(`target.type.${type === 'web-url' ? 'webUrl' : type === 'local-web' ? 'localWeb' : type === 'source-code' ? 'sourceCode' : 'api'}`, type);
}

function targetUsesUrl(target) {
  return target && ['web-url', 'local-web', 'api'].includes(target.type);
}

function applySelectedTargetUrl() {
  const project = getSelectedProject();
  const target = getSelectedTarget();

  if (targetUsesUrl(target) && target.url) {
    siteUrl.value = target.url;
    targetSelectedMeta.textContent = `${targetTypeLabel(target.type)} | ${target.url}`;
    return;
  }

  if (target?.type === 'source-code') {
    targetSelectedMeta.textContent = `${targetTypeLabel(target.type)} | ${target.localPath || t('target.noPath', 'No local path')}`;
  } else {
    targetSelectedMeta.textContent = project
      ? t('target.fallbackProjectUrl', 'Fallback to project base URL')
      : t('target.noSelected', 'No target selected');
  }

  if (project?.baseUrl) {
    siteUrl.value = project.baseUrl;
  }
}

function readSuiteConfig() {
  const config = {};

  for (const field of suiteConfigPanel.querySelectorAll('[data-config-key]')) {
    const key = field.dataset.configKey;

    if (field.type === 'checkbox') {
      config[key] = field.checked;
    } else if (field.type === 'number') {
      config[key] = Number(field.value || 0);
    } else {
      config[key] = field.value;
    }
  }

  return config;
}

function updateSuiteTypeMenu() {
  for (const button of suiteTypeMenu.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.suiteType === suiteType.value);
  }
}

function renderSuiteConfig(config = {}) {
  const typeInfo = suiteTypeConfig[suiteType.value] || suiteTypeConfig['seo-basic'];
  const suiteLabel = t(typeInfo.labelKey, suiteType.value);
  const suiteHint = t(typeInfo.hintKey, '');

  suiteDescription.placeholder = suiteHint;
  suiteConfigPanel.innerHTML = `
    <div class="suite-config-heading">
      <strong>${escapeHtml(t('suite.settings', '{name} settings', { name: suiteLabel }))}</strong>
      <span>${escapeHtml(suiteHint)}</span>
    </div>
    <div class="suite-config-grid">
      ${typeInfo.fields
        .map(([key, labelKey, inputType, defaultValue]) => {
          const value = Object.prototype.hasOwnProperty.call(config, key) ? config[key] : defaultValue;
          const label = t(labelKey, labelKey);

          if (inputType === 'checkbox') {
            return `
              <label class="toggle-field compact-toggle">
                <input data-config-key="${key}" type="checkbox" ${value ? 'checked' : ''}>
                ${escapeHtml(label)}
              </label>
            `;
          }

          if (inputType === 'textarea') {
            return `
              <label class="full-field">
                ${escapeHtml(label)}
                <textarea data-config-key="${key}" class="plain-textarea">${escapeHtml(String(value || ''))}</textarea>
              </label>
            `;
          }

          return `
            <label>
              ${escapeHtml(label)}
              <input data-config-key="${key}" type="${inputType}" value="${escapeHtml(String(value ?? ''))}">
            </label>
          `;
        })
        .join('')}
    </div>
  `;
  updateSuiteTypeMenu();
}

function setSuiteType(type, config = {}) {
  suiteType.value = suiteTypeConfig[type] ? type : 'seo-basic';
  renderSuiteConfig(config);
}

function resetProjectForm() {
  projectId.value = '';
  projectName.value = '';
  projectDescription.value = '';
  projectBaseUrl.value = '';
  projectEnvironment.value = 'production';
  deleteProjectButton.disabled = true;
}

function resetSuiteForm() {
  suiteId.value = '';
  suiteName.value = '';
  suiteDescription.value = '';
  suiteEnabled.checked = true;
  deleteSuiteButton.disabled = true;
  setSuiteType('seo-basic');
}

function resetCaseForm() {
  caseId.value = '';
  caseCode.value = '';
  caseName.value = '';
  caseDescription.value = '';
  casePriority.value = 'medium';
  caseEnabled.checked = true;
  caseExpectedResult.value = '';
  deleteCaseButton.disabled = true;
}

function resetTargetForm() {
  targetId.value = '';
  targetName.value = '';
  targetType.value = 'web-url';
  targetUrl.value = '';
  targetLocalPath.value = '';
  targetConfig.value = '{}';
  targetEnabled.checked = true;
  deleteTargetButton.disabled = true;
  updateTargetTypeFields();
}

function fillSuiteForm(suite) {
  suiteId.value = suite.id;
  suiteName.value = suite.name;
  suiteDescription.value = suite.description || '';
  suiteEnabled.checked = Boolean(suite.enabled);
  deleteSuiteButton.disabled = false;
  setSuiteType(suite.type || 'seo-basic', suite.config || {});
}

function fillCaseForm(testCase) {
  caseId.value = testCase.id;
  caseCode.value = testCase.code;
  caseName.value = testCase.name;
  caseDescription.value = testCase.description || '';
  casePriority.value = testCase.priority || 'medium';
  caseEnabled.checked = Boolean(testCase.enabled);
  caseExpectedResult.value = testCase.expectedResult || '';
  deleteCaseButton.disabled = false;
}

function fillTargetForm(target) {
  targetId.value = target.id;
  targetName.value = target.name;
  targetType.value = target.type || 'web-url';
  targetUrl.value = target.url || '';
  targetLocalPath.value = target.localPath || '';
  targetConfig.value = JSON.stringify(target.config || {}, null, 2);
  targetEnabled.checked = Boolean(target.enabled);
  deleteTargetButton.disabled = false;
  updateTargetTypeFields();
}

function updateTargetTypeFields() {
  const isSourceCode = targetType.value === 'source-code';
  targetUrlField.hidden = isSourceCode;
  targetPathField.hidden = !isSourceCode;
  targetUrl.required = !isSourceCode;
  targetLocalPath.required = isSourceCode;
}

function fillProjectForm(project) {
  projectId.value = project.id;
  projectName.value = project.name;
  projectDescription.value = project.description || '';
  projectBaseUrl.value = project.baseUrl;
  projectEnvironment.value = project.environment || 'production';
  deleteProjectButton.disabled = false;
}

function selectProject(projectIdValue) {
  projectState.selectedId = projectIdValue || '';
  projectSelect.value = projectState.selectedId;
  suiteState.selectedId = '';
  caseState.selectedId = '';
  caseState.cases = [];
  targetState.selectedId = '';
  resetSuiteForm();
  resetCaseForm();
  resetTargetForm();

  const project = getSelectedProject();

  if (!project) {
    projectSelectedMeta.textContent = t('common.manualUrl', 'Manual URL');
    suiteState.suites = [];
    targetState.targets = [];
    caseState.cases = [];
    renderTargets();
    renderSuites();
    renderCases();
    resetProjectForm();
    return;
  }

  siteUrl.value = project.baseUrl;
  projectSelectedMeta.textContent = `${project.environment.toUpperCase()} | ${project.baseUrl}`;
  fillProjectForm(project);
  projectSelectedMeta.textContent = `${project.environment.toUpperCase()} | ${project.baseUrl}`;
  renderProjects();
  loadSuites(project.id).catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
  loadTargets(project.id).catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
}

function renderProjects() {
  projectList.innerHTML = '';
  projectSelect.innerHTML = `<option value="">${escapeHtml(t('common.manualUrl', 'Manual URL'))}</option>`;
  projectCount.textContent = t('projects.count', '{count} {item}', {
    count: projectState.projects.length,
    item: projectState.projects.length === 1
      ? t('projects.itemSingular', 'project')
      : t('projects.itemPlural', 'projects'),
  });

  if (!projectState.projects.length) {
    projectList.innerHTML = `<p class="empty">${escapeHtml(t('projects.empty', 'No projects yet.'))}</p>`;
    projectSelectedMeta.textContent = t('projects.noSelected', 'No project selected');
    return;
  }

  const query = projectState.query.toLowerCase();
  const visibleProjects = projectState.projects.filter((project) => {
    const haystack = `${project.name} ${project.description} ${project.baseUrl} ${project.environment}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!visibleProjects.length) {
    projectList.innerHTML = `<p class="empty">${escapeHtml(t('projects.emptySearch', 'No projects match this search.'))}</p>`;
  }

  for (const project of projectState.projects) {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = `${project.name} (${project.environment})`;
    projectSelect.appendChild(option);
  }

  for (const project of visibleProjects) {

    const item = document.createElement('button');
    item.type = 'button';
    item.className = `project-item${project.id === projectState.selectedId ? ' active' : ''}`;
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(project.name)}</strong>
        <small>${escapeHtml(project.description || project.baseUrl)}</small>
      </span>
      <span class="env-badge ${project.environment}">${escapeHtml(project.environment)}</span>
    `;
    item.addEventListener('click', () => selectProject(project.id));
    projectList.appendChild(item);
  }

  if (projectState.selectedId && !getSelectedProject()) {
    projectState.selectedId = '';
  }

  projectSelect.value = projectState.selectedId;
  const selectedProject = getSelectedProject();
  projectSelectedMeta.textContent = selectedProject
    ? `${selectedProject.environment.toUpperCase()} | ${selectedProject.baseUrl}`
    : t('common.manualUrl', 'Manual URL');
}

async function loadProjects() {
  const projects = await requestJson('/api/projects');
  projectState.projects = projects;
  renderProjects();
}

function renderTargets() {
  targetList.innerHTML = '';
  targetSelect.innerHTML = `<option value="">${escapeHtml(t('target.noSelected', 'No target selected'))}</option>`;
  targetCount.textContent = t('target.count', '{count} {item}', {
    count: targetState.targets.length,
    item: targetState.targets.length === 1
      ? t('target.itemSingular', 'target')
      : t('target.itemPlural', 'targets'),
  });

  const project = getSelectedProject();

  if (!project) {
    targetList.innerHTML = `<p class="empty">${escapeHtml(t('target.emptyProject', 'Select a project to manage targets.'))}</p>`;
    targetSelectedMeta.textContent = t('target.loadHint', 'Select a project to load targets');
    return;
  }

  if (!targetState.targets.length) {
    targetList.innerHTML = `<p class="empty">${escapeHtml(t('target.empty', 'No targets for this project yet.'))}</p>`;
    targetSelectedMeta.textContent = t('target.fallbackProjectUrl', 'Fallback to project base URL');
    return;
  }

  const query = targetState.query.toLowerCase();
  const visibleTargets = targetState.targets.filter((target) => {
    const haystack = `${target.name} ${target.type} ${target.url} ${target.localPath} ${target.enabled ? 'enabled' : 'disabled'}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!visibleTargets.length) {
    targetList.innerHTML = `<p class="empty">${escapeHtml(t('target.emptySearch', 'No targets match this search.'))}</p>`;
  }

  for (const target of targetState.targets) {
    const option = document.createElement('option');
    option.value = target.id;
    option.textContent = `${target.name} (${targetTypeLabel(target.type)})${target.enabled ? '' : ` - ${t('common.disabled', 'disabled')}`}`;
    option.disabled = !target.enabled;
    targetSelect.appendChild(option);
  }

  for (const target of visibleTargets) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `target-item${target.id === targetState.selectedId ? ' active' : ''}${target.enabled ? '' : ' disabled'}`;
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(target.name)}</strong>
        <small>${escapeHtml(target.url || target.localPath || target.type)}</small>
      </span>
      <span>
        <span class="target-type">${escapeHtml(targetTypeLabel(target.type))}</span>
        <small class="target-state">${target.enabled ? escapeHtml(t('common.enabled', 'enabled')) : escapeHtml(t('common.disabled', 'disabled'))}</small>
      </span>
    `;
    item.addEventListener('click', () => selectTarget(target.id));
    targetList.appendChild(item);
  }

  if (targetState.selectedId && !getSelectedTarget()) {
    targetState.selectedId = '';
  }

  targetSelect.value = targetState.selectedId;
  applySelectedTargetUrl();
}

function selectTarget(targetIdValue) {
  targetState.selectedId = targetIdValue || '';
  targetSelect.value = targetState.selectedId;

  const target = getSelectedTarget();

  if (!target) {
    resetTargetForm();
    renderTargets();
    return;
  }

  fillTargetForm(target);
  renderTargets();
}

async function loadTargets(projectIdValue = projectState.selectedId) {
  if (!projectIdValue) {
    targetState.targets = [];
    targetState.selectedId = '';
    renderTargets();
    return;
  }

  const targets = await requestJson(`/api/test-targets?projectId=${encodeURIComponent(projectIdValue)}`);
  targetState.targets = targets;

  if (targetState.selectedId && !targetState.targets.some((target) => target.id === targetState.selectedId)) {
    targetState.selectedId = '';
  }

  renderTargets();
}

function renderSuites() {
  suiteList.innerHTML = '';
  suiteSelect.innerHTML = `<option value="">${escapeHtml(t('suite.noSelected', 'No suite selected'))}</option>`;
  suiteCount.textContent = t('suite.count', '{count} {item}', {
    count: suiteState.suites.length,
    item: suiteState.suites.length === 1
      ? t('suite.itemSingular', 'suite')
      : t('suite.itemPlural', 'suites'),
  });

  const project = getSelectedProject();

  if (!project) {
    suiteList.innerHTML = `<p class="empty">${escapeHtml(t('suite.emptyProject', 'Select a project to manage suites.'))}</p>`;
    suiteSelectedMeta.textContent = t('suite.loadHint', 'Select a project to load suites');
    return;
  }

  if (!suiteState.suites.length) {
    suiteList.innerHTML = `<p class="empty">${escapeHtml(t('suite.empty', 'No suites for this project yet.'))}</p>`;
    suiteSelectedMeta.textContent = t('suite.noSelected', 'No suite selected');
    return;
  }

  const query = suiteState.query.toLowerCase();
  const visibleSuites = suiteState.suites.filter((suite) => {
    const haystack = `${suite.name} ${suite.description} ${suite.type} ${suite.enabled ? 'enabled' : 'disabled'}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!visibleSuites.length) {
    suiteList.innerHTML = `<p class="empty">${escapeHtml(t('suite.emptySearch', 'No suites match this search.'))}</p>`;
  }

  for (const suite of suiteState.suites) {
    const option = document.createElement('option');
    option.value = suite.id;
    option.textContent = `${suite.name} (${suite.type})${suite.enabled ? '' : ` - ${t('common.disabled', 'disabled')}`}`;
    option.disabled = !suite.enabled;
    suiteSelect.appendChild(option);
  }

  for (const suite of visibleSuites) {

    const item = document.createElement('button');
    item.type = 'button';
    item.className = `suite-item${suite.id === suiteState.selectedId ? ' active' : ''}${suite.enabled ? '' : ' disabled'}`;
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(suite.name)}</strong>
        <small>${escapeHtml(suite.description || suite.type)}</small>
      </span>
        <span>
          <span class="suite-type">${escapeHtml(suite.type)}</span>
        <small class="suite-state">${suite.enabled ? escapeHtml(t('common.enabled', 'enabled')) : escapeHtml(t('common.disabled', 'disabled'))}</small>
      </span>
    `;
    item.addEventListener('click', () => selectSuite(suite.id));
    suiteList.appendChild(item);
  }

  if (suiteState.selectedId && !getSelectedSuite()) {
    suiteState.selectedId = '';
  }

  suiteSelect.value = suiteState.selectedId;
  const selectedSuite = getSelectedSuite();
  suiteSelectedMeta.textContent = selectedSuite
    ? `${selectedSuite.type} | ${selectedSuite.enabled ? t('common.enabled', 'enabled') : t('common.disabled', 'disabled')}`
    : t('suite.noSelected', 'No suite selected');
}

function renderCases() {
  caseLibraryList.innerHTML = '';
  caseCount.textContent = t('case.count', '{count} {item}', {
    count: caseState.cases.length,
    item: caseState.cases.length === 1
      ? t('case.itemSingular', 'case')
      : t('case.itemPlural', 'cases'),
  });

  const suite = getSelectedSuite();

  if (!suite) {
    caseLibraryList.innerHTML = `<p class="empty">${escapeHtml(t('case.emptySuite', 'Select a suite to manage cases.'))}</p>`;
    return;
  }

  if (!caseState.cases.length) {
    caseLibraryList.innerHTML = `<p class="empty">${escapeHtml(t('case.empty', 'No test cases for this suite yet.'))}</p>`;
    return;
  }

  const query = caseState.query.toLowerCase();
  const visibleCases = caseState.cases.filter((testCase) => {
    const haystack = `${testCase.code} ${testCase.name} ${testCase.description} ${testCase.priority} ${testCase.expectedResult} ${testCase.enabled ? 'enabled' : 'disabled'}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!visibleCases.length) {
    caseLibraryList.innerHTML = `<p class="empty">${escapeHtml(t('case.emptySearch', 'No cases match this search.'))}</p>`;
  }

  for (const testCase of visibleCases) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `case-library-item${testCase.id === caseState.selectedId ? ' active' : ''}${testCase.enabled ? '' : ' disabled'}`;
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(testCase.name)}</strong>
        <small>${escapeHtml(testCase.description || testCase.expectedResult || testCase.code)}</small>
      </span>
      <span>
        <span class="case-code-badge">${escapeHtml(testCase.code)}</span>
        <small class="case-priority-badge ${escapeHtml(testCase.priority || 'medium')}">${escapeHtml(testCase.priority || 'medium')}</small>
        <small class="suite-state">${testCase.enabled ? escapeHtml(t('common.enabled', 'enabled')) : escapeHtml(t('common.disabled', 'disabled'))}</small>
      </span>
    `;
    item.addEventListener('click', () => selectCase(testCase.id));
    caseLibraryList.appendChild(item);
  }

  if (caseState.selectedId && !getSelectedCase()) {
    caseState.selectedId = '';
  }
}

function selectCase(caseIdValue) {
  caseState.selectedId = caseIdValue || '';
  const testCase = getSelectedCase();

  if (!testCase) {
    resetCaseForm();
    renderCases();
    return;
  }

  fillCaseForm(testCase);
  renderCases();
}

function selectSuite(suiteIdValue) {
  suiteState.selectedId = suiteIdValue || '';
  suiteSelect.value = suiteState.selectedId;
  caseState.selectedId = '';
  caseState.cases = [];
  resetCaseForm();

  const suite = getSelectedSuite();

  if (!suite) {
    suiteSelectedMeta.textContent = t('suite.noSelected', 'No suite selected');
    resetSuiteForm();
    renderSuites();
    renderCases();
    return;
  }

  suiteSelectedMeta.textContent = `${suite.type} | ${suite.enabled ? t('common.enabled', 'enabled') : t('common.disabled', 'disabled')}`;
  fillSuiteForm(suite);
  renderSuites();
  loadCases(suite.id).catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
}

async function loadSuites(projectIdValue = projectState.selectedId) {
  if (!projectIdValue) {
    suiteState.suites = [];
    suiteState.selectedId = '';
    caseState.cases = [];
    caseState.selectedId = '';
    renderSuites();
    renderCases();
    return;
  }

  const suites = await requestJson(`/api/test-suites?projectId=${encodeURIComponent(projectIdValue)}`);
  suiteState.suites = suites;

  if (suiteState.selectedId && !suiteState.suites.some((suite) => suite.id === suiteState.selectedId)) {
    suiteState.selectedId = '';
  }

  renderSuites();
}

async function loadCases(suiteIdValue = suiteState.selectedId) {
  if (!suiteIdValue) {
    caseState.cases = [];
    caseState.selectedId = '';
    renderCases();
    return;
  }

  const cases = await requestJson(`/api/test-cases?suiteId=${encodeURIComponent(suiteIdValue)}`);
  caseState.cases = cases;

  if (caseState.selectedId && !caseState.cases.some((testCase) => testCase.id === caseState.selectedId)) {
    caseState.selectedId = '';
  }

  renderCases();
}

async function saveSuite(event) {
  event.preventDefault();

  if (!projectState.selectedId) {
    setStatus(t('suite.selectProjectStatus', 'Select project'), 'failed');
    return;
  }

  const payload = {
    projectId: projectState.selectedId,
    name: suiteName.value,
    type: suiteType.value,
    description: suiteDescription.value,
    config: readSuiteConfig(),
    enabled: suiteEnabled.checked,
  };
  const editingId = suiteId.value;
  const suite = await requestJson(editingId ? `/api/test-suites/${encodeURIComponent(editingId)}` : '/api/test-suites', {
    method: editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  await loadSuites(projectState.selectedId);
  selectSuite(suite.id);
  setStatus(t('suite.saved', 'Suite saved'), 'passed');
}

async function deleteSelectedSuite() {
  const editingId = suiteId.value;

  if (!editingId) {
    return;
  }

  const suite = getSelectedSuite();
  const confirmed = window.confirm(t('suite.confirmDelete', 'Delete suite "{name}"?', {
    name: suite?.name || t('suite.noSelected', 'selected suite'),
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/test-suites/${encodeURIComponent(editingId)}`, {
    method: 'DELETE',
  });
  suiteState.selectedId = '';
  caseState.selectedId = '';
  caseState.cases = [];
  resetSuiteForm();
  resetCaseForm();
  await loadSuites(projectState.selectedId);
  renderCases();
  setStatus(t('suite.deleted', 'Suite deleted'), 'passed');
}

async function saveCase(event) {
  event.preventDefault();

  if (!suiteState.selectedId) {
    setStatus(t('case.selectSuiteStatus', 'Select suite'), 'failed');
    return;
  }

  const payload = {
    suiteId: suiteState.selectedId,
    code: caseCode.value,
    name: caseName.value,
    description: caseDescription.value,
    priority: casePriority.value,
    enabled: caseEnabled.checked,
    expectedResult: caseExpectedResult.value,
  };
  const editingId = caseId.value;
  const testCase = await requestJson(editingId ? `/api/test-cases/${encodeURIComponent(editingId)}` : '/api/test-cases', {
    method: editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  await loadCases(suiteState.selectedId);
  selectCase(testCase.id);
  setStatus(t('case.saved', 'Case saved'), 'passed');
}

async function deleteSelectedCase() {
  const editingId = caseId.value;

  if (!editingId) {
    return;
  }

  const testCase = getSelectedCase();
  const confirmed = window.confirm(t('case.confirmDelete', 'Delete case "{name}"?', {
    name: testCase?.name || t('case.noSelected', 'selected case'),
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/test-cases/${encodeURIComponent(editingId)}`, {
    method: 'DELETE',
  });
  caseState.selectedId = '';
  resetCaseForm();
  await loadCases(suiteState.selectedId);
  setStatus(t('case.deleted', 'Case deleted'), 'passed');
}

function readTargetConfig() {
  const text = targetConfig.value.trim();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

async function saveTarget(event) {
  event.preventDefault();

  if (!projectState.selectedId) {
    setStatus(t('target.selectProjectStatus', 'Select project'), 'failed');
    return;
  }

  let config = {};

  try {
    config = readTargetConfig();
  } catch {
    setStatus(t('target.invalidConfig', 'Target config must be valid JSON'), 'failed');
    return;
  }

  const payload = {
    projectId: projectState.selectedId,
    name: targetName.value,
    type: targetType.value,
    url: targetUrl.value,
    localPath: targetLocalPath.value,
    config,
    enabled: targetEnabled.checked,
  };
  const editingId = targetId.value;
  const target = await requestJson(editingId ? `/api/test-targets/${encodeURIComponent(editingId)}` : '/api/test-targets', {
    method: editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  await loadTargets(projectState.selectedId);
  selectTarget(target.id);
  setStatus(t('target.saved', 'Target saved'), 'passed');
}

async function deleteSelectedTarget() {
  const editingId = targetId.value;

  if (!editingId) {
    return;
  }

  const target = getSelectedTarget();
  const confirmed = window.confirm(t('target.confirmDelete', 'Delete target "{name}"?', {
    name: target?.name || t('target.noSelected', 'selected target'),
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/test-targets/${encodeURIComponent(editingId)}`, {
    method: 'DELETE',
  });
  targetState.selectedId = '';
  resetTargetForm();
  await loadTargets(projectState.selectedId);
  setStatus(t('target.deleted', 'Target deleted'), 'passed');
}

async function saveProject(event) {
  event.preventDefault();

  const payload = {
    name: projectName.value,
    description: projectDescription.value,
    baseUrl: projectBaseUrl.value,
    environment: projectEnvironment.value,
  };
  const editingId = projectId.value;
  const project = await requestJson(editingId ? `/api/projects/${encodeURIComponent(editingId)}` : '/api/projects', {
    method: editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  await loadProjects();
  selectProject(project.id);
  setStatus(t('projects.saved', 'Project saved'), 'passed');
}

async function deleteSelectedProject() {
  const editingId = projectId.value;

  if (!editingId) {
    return;
  }

  const project = getSelectedProject();
  const confirmed = window.confirm(t('projects.confirmDelete', 'Delete project "{name}"?', {
    name: project?.name || t('projects.noSelected', 'selected project'),
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/projects/${encodeURIComponent(editingId)}`, {
    method: 'DELETE',
  });
  projectState.selectedId = '';
  suiteState.selectedId = '';
  suiteState.suites = [];
  caseState.selectedId = '';
  caseState.cases = [];
  targetState.selectedId = '';
  targetState.targets = [];
  resetProjectForm();
  resetSuiteForm();
  resetCaseForm();
  resetTargetForm();
  renderTargets();
  renderSuites();
  renderCases();
  await loadProjects();
  setStatus(t('projects.deleted', 'Project deleted'), 'passed');
}

function renderCaseDetail(testCase) {
  const details = [
    [t('detail.whatItTests', 'What it tests'), testCase.description],
    [t('detail.expected', 'Expected'), testCase.expected],
    [t('detail.actual', 'Actual result'), testCase.actual],
    [t('detail.selector', 'Selector'), testCase.selector],
  ].filter(([, value]) => value);

  return `
    <div class="case-detail" hidden>
      ${details
        .map(
          ([label, value]) => `
            <div class="case-detail-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join('')}
      ${testCase.code ? `<pre class="case-code">${escapeHtml(testCase.code)}</pre>` : ''}
      ${testCase.error ? `<pre class="case-error">${escapeHtml(testCase.error)}</pre>` : ''}
    </div>
  `;
}

function renderCaseFacts(testCase) {
  const facts = [
    [t('flow.goal', 'Goal'), testCase.description],
    [t('detail.expected', 'Expected'), testCase.expected],
    [t('detail.actual', 'Actual result'), testCase.actual],
    [t('common.duration', 'Duration'), formatDuration(testCase.durationMs)],
  ].filter(([, value]) => value);

  if (!facts.length) {
    return '';
  }

  return `
    <div class="case-facts">
      ${facts
        .map(
          ([label, value]) => `
            <button
              type="button"
              class="case-fact"
              data-fact-label="${escapeHtml(label)}"
              data-fact-value="${escapeHtml(value)}"
            >
              <small>${escapeHtml(label)}</small>
              <strong>${escapeHtml(value)}</strong>
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function openFactDetail(label, value, testCase = {}) {
  const steps = Array.isArray(testCase.steps) ? testCase.steps : [];
  factTitle.textContent = label || t('factDetail.title', 'Detail');
  factBody.innerHTML = `
    <div class="fact-primary">
      <small>${escapeHtml(label || t('factDetail.title', 'Detail'))}</small>
      <strong>${escapeHtml(value || '')}</strong>
    </div>
    <div class="fact-grid">
      ${[
        [t('flow.goal', 'Goal'), testCase.description],
        [t('detail.expected', 'Expected'), testCase.expected],
        [t('detail.actual', 'Actual result'), testCase.actual],
        [t('common.duration', 'Duration'), formatDuration(testCase.durationMs)],
        [t('detail.selector', 'Selector'), testCase.selector],
      ]
        .filter(([, factValue]) => factValue)
        .map(
          ([factLabel, factValue]) => `
            <span>
              <small>${escapeHtml(factLabel)}</small>
              <strong>${escapeHtml(factValue)}</strong>
            </span>
          `
        )
        .join('')}
    </div>
    ${
      steps.length
        ? `
          <div class="fact-section">
            <strong>${escapeHtml(t('flow.stepCount', '{count} steps', { count: steps.length }))}</strong>
            ${renderCaseSteps(testCase)}
          </div>
        `
        : ''
    }
    ${testCase.error ? `<pre class="case-error">${escapeHtml(testCase.error)}</pre>` : ''}
    ${testCase.code ? `<pre class="case-code">${escapeHtml(testCase.code)}</pre>` : ''}
  `;
  factOverlay.hidden = false;
}

function renderCaseSteps(testCase) {
  const steps = Array.isArray(testCase.steps) && testCase.steps.length
    ? testCase.steps
    : [
        {
          title: t('flow.openTarget', 'Open target page'),
          detail: t('flow.openTargetDetail', 'Chromium opens the Website URL for this generated case.'),
          status: testCase.status === 'pending' ? 'pending' : 'passed',
        },
        {
          title: t('flow.runCheck', 'Run generated check'),
          detail: testCase.description || t('flow.runCheckDetail', 'Playwright executes the assertion created from the AI request.'),
          status: testCase.status || 'pending',
        },
        {
          title: t('flow.recordResult', 'Record result'),
          detail: testCase.actual || t('flow.recordResultDetail', 'The status, duration, and captured details are saved into run history.'),
          status: testCase.status || 'pending',
        },
      ];

  return `
    <ol class="case-steps">
      ${steps
        .map(
          (step, index) => `
            <li class="${escapeHtml(step.status || 'pending')}">
              <span class="step-number">${index + 1}</span>
              <span>
                <strong>${escapeHtml(step.title || t('flow.step', 'Step'))}</strong>
                <small>${escapeHtml(step.detail || '')}</small>
              </span>
            </li>
          `
        )
        .join('')}
    </ol>
  `;
}

function renderGeneratedPlan(cases = []) {
  generatedPlan.innerHTML = '';
  generatedPlan.classList.toggle('is-empty', !cases.length);

  if (!cases.length) {
    generatedPlan.innerHTML = `
      <div class="space-empty">
        <strong>${escapeHtml(t('flow.emptyTitle', 'No rendered cases yet'))}</strong>
        <span>${escapeHtml(t('flow.emptyText', 'Generate a test to see AI test cases floating here.'))}</span>
      </div>
    `;
    return;
  }

  cases.forEach((testCase, index) => {
    const item = document.createElement('article');
    item.className = 'plan-card';
    item.tabIndex = 0;
    item.testCase = testCase;
    item.style.setProperty('--float-index', String(index % 6));
    item.innerHTML = `
      <span class="plan-main">
        <span>
          <span class="case-node-index">${String(index + 1).padStart(2, '0')}</span>
          <strong>${escapeHtml(testCase.title || 'Untitled test')}</strong>
          <small>${escapeHtml(testCase.description || t('flow.generatedCase', 'Generated Playwright case'))}</small>
        </span>
        <span>
          <span class="case-status ${testCase.status || 'pending'}">${escapeHtml(statusText(testCase.status || 'pending'))}</span>
          <small class="step-count">${escapeHtml(t('flow.stepCount', '{count} steps', {
            count: Array.isArray(testCase.steps) && testCase.steps.length ? testCase.steps.length : 3,
          }))}</small>
        </span>
      </span>
      <div class="plan-detail" hidden>
        ${renderCaseFacts(testCase)}
        ${renderCaseSteps(testCase)}
      </div>
    `;
    const toggleItem = () => {
      const detail = item.querySelector('.plan-detail');
      const isOpen = item.classList.toggle('open');
      detail.hidden = !isOpen;
    };
    item.addEventListener('click', (event) => {
      const factButton = event.target.closest('.case-fact');

      if (factButton) {
        event.stopPropagation();
        openFactDetail(factButton.dataset.factLabel, factButton.dataset.factValue, item.testCase);
        return;
      }

      toggleItem();
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      if (event.target.closest('.case-fact')) {
        return;
      }

      event.preventDefault();
      toggleItem();
    });
    generatedPlan.appendChild(item);
  });
}

function updateLatest(run) {
  if (!run) {
    return;
  }

  metricTotal.textContent = run.summary.total;
  metricPassed.textContent = run.summary.passed;
  metricFailed.textContent = run.summary.failed;
  metricDuration.textContent = formatDuration(run.durationMs);
  latestTime.textContent = new Date(run.createdAt).toLocaleString();
  renderGeneratedPlan(run.cases || []);
  setStatus(statusText(run.status), run.status);
}

function getRunTitle(run) {
  if (run.suiteName) {
    return run.suiteName;
  }

  if (run.userRequest?.trim()) {
    return run.userRequest.trim();
  }

  if (run.cases?.some((testCase) => testCase.title?.toLowerCase().includes('meta description'))) {
    return 'SEO checks';
  }

  if (run.cases?.[0]?.title) {
    return run.cases[0].title;
  }

  return 'Website test run';
}

function renderHistory() {
  const runs = historyState.runs;
  const totalPages = Math.max(1, Math.ceil(runs.length / historyState.pageSize));

  if (historyState.page > totalPages) {
    historyState.page = totalPages;
  }

  const start = (historyState.page - 1) * historyState.pageSize;
  const pageRuns = runs.slice(start, start + historyState.pageSize);

  historyList.innerHTML = '';
  historyCount.textContent = runs.length
    ? t('history.savedRuns', '{count} saved runs', { count: runs.length })
    : t('history.noSavedRuns', 'No saved runs');
  pageInfo.textContent = t('history.page', 'Page {page} of {total}', {
    page: historyState.page,
    total: totalPages,
  });
  prevPageButton.disabled = historyState.page <= 1;
  nextPageButton.disabled = historyState.page >= totalPages;
  historyPagination.hidden = runs.length <= historyState.pageSize;

  if (!runs.length) {
    historyList.innerHTML = `<p class="empty">${escapeHtml(t('history.empty', 'No test runs yet.'))}</p>`;
    return;
  }

  for (const run of pageRuns) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    item.dataset.runId = run.id;
    item.innerHTML = `
      <span class="run-status ${run.status}">${escapeHtml(statusText(run.status))}</span>
      <span class="history-url">
        <strong class="history-title">${escapeHtml(getRunTitle(run))}</strong>
        <strong>${escapeHtml(run.url)}</strong>
        <span>${new Date(run.createdAt).toLocaleString()}</span>
      </span>
      <span class="history-metrics">
        ${escapeHtml(t('history.passedSummary', '{passed}/{total} passed - {duration}', {
          passed: run.summary.passed,
          total: run.summary.total,
          duration: formatDuration(run.durationMs),
        }))}
      </span>
    `;
    item.addEventListener('click', () => openRunDetail(run.id));
    historyList.appendChild(item);
  }

  updateLatest(runs[0]);
}

async function loadRuns() {
  const runs = await requestJson('/api/runs');
  historyState.runs = runs;
  historyState.page = 1;
  renderHistory();
}

async function pollRunUntilDone(runId) {
  let run;

  for (let attempt = 0; attempt < 360; attempt += 1) {
    await sleep(1500);
    run = await requestJson(`/api/runs/${encodeURIComponent(runId)}`);
    updateLatest(run);

    if (run.generatedCode) {
      generatedCode.value = run.generatedCode;
    }

    await loadRuns();

    if (run.status === 'running') {
      setProgress('run', 70);
    } else if (run.status === 'queued') {
      setProgress('generate', 25);
    }

    if (isRunDone(run)) {
      return run;
    }
  }

  throw new Error(t('queue.pollTimeout', 'Run is still not finished after the polling timeout.'));
}

async function generateOnly() {
  setBusy(true, t('common.generating', 'Generating'));
  generateButton.textContent = `${t('common.generating', 'Generating')}...`;
  runButton.textContent = t('common.pleaseWait', 'Please wait');
  refreshButton.textContent = t('common.pleaseWait', 'Please wait');
  setProgress('generate', 30);

  try {
    const result = await requestJson('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        url: siteUrl.value,
        projectId: projectState.selectedId,
        suiteId: suiteState.selectedId,
        targetId: targetState.selectedId,
        userRequest: aiRequest.value,
        auth: collectAuth(),
      }),
    });

    setProgress('save', 75);
    generatedCode.value = result.code;
    generatedPath.textContent = result.outputPath;
    renderGeneratedPlan(result.cases || []);
    setStatus(t('common.generated', 'Generated'), 'passed');
    setProgress('store', 100);
  } catch (error) {
    generatedCode.value = error.message;
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  } finally {
    setBusy(false, systemStatus.textContent);
    setTimeout(resetProgress, 900);
  }
}

async function runTest() {
  setBusy(true, t('common.queued', 'Queued'));
  runButton.textContent = `${t('common.queued', 'Queued')}...`;
  generateButton.textContent = t('common.pleaseWait', 'Please wait');
  refreshButton.textContent = t('common.pleaseWait', 'Please wait');
  setProgress('generate', 15);

  try {
    const run = await requestJson('/api/run', {
      method: 'POST',
      body: JSON.stringify({
        url: siteUrl.value,
        projectId: projectState.selectedId,
        suiteId: suiteState.selectedId,
        targetId: targetState.selectedId,
        userRequest: aiRequest.value,
        auth: collectAuth(),
      }),
    });

    updateLatest(run);
    setStatus(t('queue.queued', 'Run queued'), 'queued');
    setProgress('generate', 25);
    await loadRuns();
    setBusy(false, systemStatus.textContent);

    const finalRun = await pollRunUntilDone(run.runId || run.id);

    if (finalRun.generatedCode) {
      generatedCode.value = finalRun.generatedCode;
    }

    renderGeneratedPlan(finalRun.cases || []);
    setProgress('store', 100);
  } catch (error) {
    generatedCode.value = error.message;
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  } finally {
    setBusy(false, systemStatus.textContent);
    setTimeout(resetProgress, 900);
  }
}

async function openRunDetail(runId) {
  setStatus(t('common.loadingDetail', 'Loading detail'), 'busy');

  try {
    const run = await requestJson(`/api/runs/${encodeURIComponent(runId)}`);
    detailTitle.textContent = run.url;
    detailSummary.innerHTML = `
      <span class="run-status ${run.status}">${escapeHtml(statusText(run.status))}</span>
      <strong>${escapeHtml(t('history.passedSummary', '{passed}/{total} passed - {duration}', {
        passed: run.summary.passed,
        total: run.summary.total,
        duration: formatDuration(run.durationMs),
      }))}</strong>
      ${run.suiteName ? `<span>${escapeHtml(run.suiteName)} (${escapeHtml(run.suiteType || 'suite')})</span>` : ''}
      ${run.targetName ? `<span>${escapeHtml(run.targetName)} (${escapeHtml(run.targetType || 'target')})</span>` : ''}
      <span>${new Date(run.createdAt).toLocaleString()}</span>
    `;
    caseList.innerHTML = '';

    if (!run.cases?.length) {
      caseList.innerHTML = `<p class="empty">${escapeHtml(t('detail.noStored', 'No case detail was stored for this run.'))}</p>`;
    } else {
      for (const testCase of run.cases) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'case-item';
        item.innerHTML = `
          <span class="case-main">
            <span>
              <strong>${escapeHtml(testCase.title)}</strong>
              <span>${formatDuration(testCase.durationMs)}</span>
            </span>
            <span class="case-status ${testCase.status}">${escapeHtml(statusText(testCase.status))}</span>
          </span>
          ${renderCaseDetail(testCase)}
          ${renderCaseSteps(testCase)}
        `;
        item.addEventListener('click', () => {
          const detail = item.querySelector('.case-detail');
          const steps = item.querySelector('.case-steps');
          const isOpen = item.classList.toggle('open');
          detail.hidden = !isOpen;
          steps.hidden = !isOpen;
        });
        const steps = item.querySelector('.case-steps');
        if (steps) {
          steps.hidden = true;
        }
        caseList.appendChild(item);
      }
    }

    detailOverlay.hidden = false;
    setStatus(run.status === 'passed' ? t('common.passed', 'Passed') : t('common.failed', 'Failed'), run.status);
  } catch (error) {
    generatedCode.value = error.message;
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  runTest();
});

projectForm.addEventListener('submit', saveProject);
suiteForm.addEventListener('submit', saveSuite);
caseForm.addEventListener('submit', saveCase);
targetForm.addEventListener('submit', saveTarget);
projectSearch.addEventListener('input', () => {
  projectState.query = projectSearch.value.trim();
  renderProjects();
});
targetSearch.addEventListener('input', () => {
  targetState.query = targetSearch.value.trim();
  renderTargets();
});
suiteSearch.addEventListener('input', () => {
  suiteState.query = suiteSearch.value.trim();
  renderSuites();
});
caseSearch.addEventListener('input', () => {
  caseState.query = caseSearch.value.trim();
  renderCases();
});
newProjectButton.addEventListener('click', () => {
  projectState.selectedId = '';
  suiteState.selectedId = '';
  suiteState.suites = [];
  caseState.selectedId = '';
  caseState.cases = [];
  targetState.selectedId = '';
  targetState.targets = [];
  projectSelect.value = '';
  projectSelectedMeta.textContent = t('common.manualUrl', 'Manual URL');
  resetProjectForm();
  resetSuiteForm();
  resetCaseForm();
  resetTargetForm();
  renderTargets();
  renderSuites();
  renderCases();
});
deleteProjectButton.addEventListener('click', deleteSelectedProject);
newTargetButton.addEventListener('click', () => {
  targetState.selectedId = '';
  targetSelect.value = '';
  targetSelectedMeta.textContent = projectState.selectedId
    ? t('target.fallbackProjectUrl', 'Fallback to project base URL')
    : t('target.loadHint', 'Select a project to load targets');
  resetTargetForm();
  renderTargets();
});
deleteTargetButton.addEventListener('click', deleteSelectedTarget);
newSuiteButton.addEventListener('click', () => {
  suiteState.selectedId = '';
  caseState.selectedId = '';
  caseState.cases = [];
  suiteSelect.value = '';
  suiteSelectedMeta.textContent = projectState.selectedId
    ? t('suite.noSelected', 'No suite selected')
    : t('suite.loadHint', 'Select a project to load suites');
  resetSuiteForm();
  resetCaseForm();
  renderSuites();
  renderCases();
});
deleteSuiteButton.addEventListener('click', deleteSelectedSuite);
newCaseButton.addEventListener('click', () => {
  caseState.selectedId = '';
  resetCaseForm();
  renderCases();
});
deleteCaseButton.addEventListener('click', deleteSelectedCase);
projectSelect.addEventListener('change', () => selectProject(projectSelect.value));
suiteSelect.addEventListener('change', () => selectSuite(suiteSelect.value));
targetSelect.addEventListener('change', () => selectTarget(targetSelect.value));
targetType.addEventListener('change', updateTargetTypeFields);
suiteTypeMenu.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-suite-type]');

  if (!button) {
    return;
  }

  setSuiteType(button.dataset.suiteType);
});
suiteType.addEventListener('change', () => setSuiteType(suiteType.value));
authMode.addEventListener('change', updateAuthFields);
generateButton.addEventListener('click', generateOnly);
refreshButton.addEventListener('click', loadRuns);
prevPageButton.addEventListener('click', () => {
  historyState.page = Math.max(1, historyState.page - 1);
  renderHistory();
});
nextPageButton.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(historyState.runs.length / historyState.pageSize));
  historyState.page = Math.min(totalPages, historyState.page + 1);
  renderHistory();
});
toggleCodeButton.addEventListener('click', () => {
  const isHidden = codePanel.hidden;
  codePanel.hidden = !isHidden;
  toggleCodeButton.textContent = isHidden ? t('flow.hideCode', 'Hide code') : t('flow.showCode', 'Show code');
});
closeDetailButton.addEventListener('click', () => {
  detailOverlay.hidden = true;
});
closeFactButton.addEventListener('click', () => {
  factOverlay.hidden = true;
});
detailOverlay.addEventListener('click', (event) => {
  if (event.target === detailOverlay) {
    detailOverlay.hidden = true;
  }
});
factOverlay.addEventListener('click', (event) => {
  if (event.target === factOverlay) {
    factOverlay.hidden = true;
  }
});

for (const switcher of languageSwitchers) {
  switcher.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-lang]');

    if (!button || button.dataset.lang === i18nState.lang) {
      return;
    }

    await loadTranslations(button.dataset.lang);
    refreshLocalizedUi();
  });
}

for (const link of pageLinks) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showPage(link.dataset.pageLink || 'run');
  });
}

async function initApp() {
  await loadTranslations(i18nState.lang);
  applyTranslations();
  showPage((location.hash || '').replace('#', ''), { updateHash: false });
  updateAuthFields();
  updateTargetTypeFields();
  renderTargets();
  renderSuites();
  renderCases();
  setSuiteType('seo-basic');
  await Promise.all([loadProjects(), loadRuns()]);
}

initApp().catch((error) => {
  generatedCode.value = error.message;
  renderGeneratedPlan([]);
  setStatus(t('common.error', 'Error'), 'failed');
});
