const form = document.querySelector('#testForm');
const projectForm = document.querySelector('#projectForm');
const projectList = document.querySelector('#projectList');
const sidebarProjectList = document.querySelector('#sidebarProjectList');
const newSidebarProjectButton = document.querySelector('#newSidebarProjectButton');
const newSidebarItemButton = document.querySelector('#newSidebarItemButton');
const workspaceTitle = document.querySelector('#workspaceTitle');
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
const selectionToggle = document.querySelector('#selectionToggle');
const selectionBackdrop = document.querySelector('#selectionBackdrop');
const selectionPopover = document.querySelector('#selectionPopover');
const selectionCloseButton = document.querySelector('#selectionCloseButton');
const selectionSummaryText = document.querySelector('#selectionSummaryText');
const targetId = document.querySelector('#targetId');
const targetName = document.querySelector('#targetName');
const targetType = document.querySelector('#targetType');
const targetUrl = document.querySelector('#targetUrl');
const targetLocalPath = document.querySelector('#targetLocalPath');
const targetConfig = document.querySelector('#targetConfig');
const targetConfigGuide = document.querySelector('#targetConfigGuide');
const targetConfigTemplateButton = document.querySelector('#targetConfigTemplateButton');
const targetConfigFormatButton = document.querySelector('#targetConfigFormatButton');
const targetEnabled = document.querySelector('#targetEnabled');
const targetUrlField = document.querySelector('.target-url-field');
const targetPathField = document.querySelector('.target-path-field');
const newTargetButton = document.querySelector('#newTargetButton');
const deleteTargetButton = document.querySelector('#deleteTargetButton');
const siteUrl = document.querySelector('#siteUrl');
const runButton = document.querySelector('#runButton');
const generateButton = document.querySelector('#generateButton');
const refreshButton = document.querySelector('#refreshButton');
const actionMenu = document.querySelector('#actionMenu');
const systemStatus = document.querySelector('#systemStatus');
const systemStatusDetail = document.querySelector('#systemStatusDetail');
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
const aiExplanationPanel = document.querySelector('#aiExplanationPanel');
const aiExplanationText = document.querySelector('#aiExplanationText');
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
const generateCaseFileButton = document.querySelector('#generateCaseFileButton');
const downloadCaseFileLink = document.querySelector('#downloadCaseFileLink');
const downloadCaseExcelLink = document.querySelector('#downloadCaseExcelLink');
const downloadCaseDocLink = document.querySelector('#downloadCaseDocLink');
const caseFileInput = document.querySelector('#caseFileInput');
const runImportedFileButton = document.querySelector('#runImportedFileButton');
const testcaseFileMeta = document.querySelector('#testcaseFileMeta');
const fileStateCard = document.querySelector('#fileStateCard');
const fileStateTitle = document.querySelector('#fileStateTitle');
const fileStateMeta = document.querySelector('#fileStateMeta');
const viewCaseDetailButton = document.querySelector('#viewCaseDetailButton');
const testcaseDetailSection = document.querySelector('#testcaseDetailSection');
const runModeSwitch = document.querySelector('#runModeSwitch');
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
const sidebarState = {
  suitesByProject: {},
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
let runControlsLocked = false;
const openPlanCardKeys = new Set();
const testcaseFileState = {
  csvContent: '',
  fileName: '',
  downloadUrl: '',
  excelDownloadUrl: '',
  docDownloadUrl: '',
  rows: [],
};
const runModeState = {
  mode: 'file',
};
const runLockControls = [
  projectSelect,
  suiteSelect,
  targetSelect,
  selectionToggle,
  siteUrl,
  aiRequest,
  authMode,
  loginUrl,
  authUsername,
  authPassword,
  successSelector,
  usernameSelector,
  passwordSelector,
  submitSelector,
  runButton,
  generateButton,
  refreshButton,
  toggleCodeButton,
  generateCaseFileButton,
  caseFileInput,
  runImportedFileButton,
].filter(Boolean);
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

  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    element.title = t(element.dataset.i18nTitle, element.title);
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

  if (!runControlsLocked) {
    setBusy(false, t('app.status.ready', 'Ready'));
  }

  updateSelectionSummary();
  updateWorkspaceTitle();
}

function showPage(page, options = {}) {
  const nextPage = ['run', 'projects', 'suites', 'reports', 'settings', 'docs'].includes(page) ? page : 'run';
  pageState.current = nextPage;
  document.body.dataset.page = nextPage;

  for (const section of pageSections) {
    const pages = (section.dataset.pageSection || '').split(/\s+/);
    section.hidden = !pages.includes(nextPage);
  }

  if (nextPage === 'run' && testcaseDetailSection?.dataset.open !== 'true') {
    testcaseDetailSection.hidden = true;
  }

  if (nextPage === 'run' && fileStateCard && !testcaseFileState.csvContent) {
    fileStateCard.hidden = true;
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

  updateWorkspaceTitle();
}

function setBusy(isBusy, label = t('app.status.ready', 'Ready')) {
  runControlsLocked = isBusy;
  setRunControlsLocked(isBusy);
  systemStatus.textContent = label;
  if (isBusy) {
    systemStatus.className = 'status-pill busy';
  } else if (label === t('app.status.ready', 'Ready')) {
    systemStatus.className = 'status-pill';
  }
  if (isBusy) {
    setStatusDetail(t('app.status.busyDetail', 'Working on the current run.'));
  } else if (label === t('app.status.ready', 'Ready')) {
    setStatusDetail('');
  }

  if (!isBusy) {
    runButton.textContent = defaultButtonLabels.run;
    generateButton.textContent = defaultButtonLabels.generate;
    refreshButton.textContent = defaultButtonLabels.refresh;
  }
}

function setControlLocked(element, isLocked) {
  if (!element || typeof element.disabled !== 'boolean') {
    return;
  }

  if (isLocked) {
    if (!('runLockDisabled' in element.dataset)) {
      element.dataset.runLockDisabled = String(element.disabled);
    }

    element.disabled = true;
    return;
  }

  if ('runLockDisabled' in element.dataset) {
    element.disabled = element.dataset.runLockDisabled === 'true';
    delete element.dataset.runLockDisabled;
  }
}

function setRunControlsLocked(isLocked) {
  for (const control of runLockControls) {
    setControlLocked(control, isLocked);
  }

  form.classList.toggle('is-locked', isLocked);
  actionMenu.classList.toggle('is-disabled', isLocked);
  actionMenu.setAttribute('aria-disabled', String(isLocked));

  if (isLocked) {
    actionMenu.open = false;
    setSelectionPopover(false);
  }
}

function setStatus(label, state) {
  systemStatus.textContent = label;
  systemStatus.className = `status-pill ${state}`;
}

function setStatusDetail(message = '') {
  if (!systemStatusDetail) {
    return;
  }

  systemStatusDetail.hidden = !message;
  systemStatusDetail.textContent = message;
  systemStatusDetail.title = systemStatusDetail.textContent;
}

function setProgress(activeStep, percent) {
  const activeElement = stepsList.querySelector(`[data-step="${activeStep}"]`);
  const activeOrder = Number(activeElement?.dataset.order || 0);

  progressPanel.hidden = false;
  progressBar.style.width = `${percent}%`;

  for (const step of stepsList.querySelectorAll('li')) {
    const order = Number(step.dataset.order || 0);
    step.classList.toggle('active', step === activeElement);
    step.classList.toggle('done', order < activeOrder);
  }
}

function resetProgress() {
  progressBar.style.width = '0%';
  progressPanel.hidden = true;

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
  if (status === 'pending') {
    return t('common.pending', 'Pending');
  }

  if (status === 'queued') {
    return t('common.queued', 'Queued');
  }

  if (status === 'generated') {
    return t('common.generated', 'Generated');
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

function runKindLabel(run = {}) {
  return run.historyKind === 'testcase-file' || run.status === 'generated'
    ? t('history.kindTestcaseFile', 'Testcase file')
    : t('history.kindAutoTest', 'Auto test');
}

function historyMetricText(run = {}) {
  if (run.historyKind === 'testcase-file' || run.status === 'generated') {
    return t('history.generatedSummary', '{total} test cases - not run yet', {
      total: run.summary?.total || 0,
    });
  }

  return t('history.passedSummary', '{passed}/{total} passed - {duration}', {
    passed: run.summary?.passed || 0,
    total: run.summary?.total || 0,
    duration: formatDuration(run.durationMs),
  });
}

function renderDownloadGroup(title, links = []) {
  const visibleLinks = links.filter((link) => link.href);

  if (!visibleLinks.length) {
    return '';
  }

  return `
    <span class="download-group">
      <strong>${escapeHtml(title)}</strong>
      ${visibleLinks.map((link) => `
        <a class="secondary file-download" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>
      `).join('')}
    </span>
  `;
}

function renderHistoryQuickDownloads(run = {}) {
  const links = [
    { href: run.testcaseExcelUrl, label: t('fileFlow.downloadSourceExcel', 'Source Excel') },
    { href: run.testcaseDocUrl, label: t('fileFlow.downloadSourceDoc', 'Source Word') },
    { href: run.testcaseCsvUrl, label: t('fileFlow.downloadSourceCsv', 'Source CSV') },
  ].filter((link) => link.href);

  if (!links.length) {
    return '';
  }

  return `
    <span class="history-actions" aria-label="${escapeHtml(t('history.downloadTestcase', 'Download testcase file'))}">
      <strong>${escapeHtml(t('history.downloadTestcase', 'Download testcase'))}</strong>
      ${links.map((link) => `
        <a class="file-download compact" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>
      `).join('')}
    </span>
  `;
}

function compactEnvironmentLabel(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  const labels = {
    production: 'PROD',
    prod: 'PROD',
    staging: 'STG',
    stage: 'STG',
    development: 'DEV',
    dev: 'DEV',
    local: 'LOCAL',
    testing: 'TEST',
    test: 'TEST',
  };

  return labels[normalized] || normalized.slice(0, 8).toUpperCase() || 'ENV';
}

function isRunDone(run) {
  return ['passed', 'failed', 'cancelled'].includes(run?.status);
}

function isRunActive(run) {
  return ['queued', 'running'].includes(run?.status);
}

function describeRunActivity(run) {
  if (!run) {
    return t('app.status.readyDetail', 'Idle. Choose a target and run a test.');
  }

  const cases = Array.isArray(run.cases) ? run.cases : [];
  const total = run.summary?.total || cases.length || 0;
  const passed = run.summary?.passed || cases.filter((testCase) => testCase.status === 'passed').length;
  const failed = run.summary?.failed || cases.filter((testCase) => testCase.status === 'failed').length;
  const running = cases.filter((testCase) => testCase.status === 'running').length;
  const pending = cases.filter((testCase) => testCase.status === 'pending').length;
  const done = Math.min(total, passed + failed);

  if (run.status === 'queued') {
    return t('app.status.queuedDetail', 'Queued. Waiting for the worker to start.');
  }

  if (run.status === 'running') {
    if (!total) {
      return t('app.status.generatingDetail', 'Generating the Playwright spec and preparing cases.');
    }

    return t('app.status.runningDetail', 'Running Chromium: {done}/{total} done, {running} running, {pending} pending.', {
      done,
      total,
      running,
      pending,
    });
  }

  return '';
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
  updateSelectionSummary();
}

function selectedOptionText(select) {
  return select?.selectedOptions?.[0]?.textContent?.trim() || '';
}

function updateSelectionSummary() {
  if (!selectionSummaryText) {
    return;
  }

  const parts = [
    selectedOptionText(projectSelect) || t('common.manualUrl', 'Manual URL'),
    selectedOptionText(suiteSelect) || t('suite.noSelected', 'No suite selected'),
    selectedOptionText(targetSelect) || t('target.noSelected', 'No target selected'),
    selectedOptionText(authMode) || t('run.noLogin', 'No login'),
  ];
  const summary = parts.join(' / ');

  selectionSummaryText.textContent = summary;
  selectionToggle.title = summary;
}

function setSelectionPopover(open) {
  selectionPopover.hidden = !open;
  selectionBackdrop.hidden = !open;
  selectionToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('modal-open', open);
}

function getSelectedProject() {
  return projectState.projects.find((project) => project.id === projectState.selectedId);
}

function getSelectedSuite() {
  return suiteState.suites.find((suite) => suite.id === suiteState.selectedId);
}

function getSidebarSuites(projectIdValue) {
  return sidebarState.suitesByProject[projectIdValue] || [];
}

function getWorkspaceTitle() {
  const suite = getSelectedSuite();
  const project = getSelectedProject();
  return suite?.name || project?.name || t('top.project', 'Passmark TestOps');
}

function updateWorkspaceTitle() {
  if (workspaceTitle) {
    workspaceTitle.textContent = getWorkspaceTitle();
  }

  document.body.dataset.workspaceItem = suiteState.selectedId
    ? 'suite'
    : projectState.selectedId
      ? 'project'
      : 'none';
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

function targetConfigTemplate(type = targetType.value) {
  const templates = {
    'web-url': {
      notes: 'Public or staging website target.',
      tags: ['web', 'browser'],
      headers: {},
    },
    'local-web': {
      notes: 'Local app target. Start the dev server before running tests.',
      tags: ['local', 'browser'],
      healthPath: '/',
    },
    api: {
      notes: 'API target placeholder for future API runner support.',
      tags: ['api'],
      headers: {
        Accept: 'application/json',
      },
    },
    'source-code': {
      notes: 'Source-code target placeholder for future source scan support.',
      tags: ['source'],
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'dist/**'],
    },
  };

  return templates[type] || templates['web-url'];
}

function targetConfigGuideKey(type = targetType.value) {
  if (type === 'local-web') {
    return 'target.configGuide.localWeb';
  }

  if (type === 'api') {
    return 'target.configGuide.api';
  }

  if (type === 'source-code') {
    return 'target.configGuide.sourceCode';
  }

  return 'target.configGuide.webUrl';
}

function isBlankTargetConfig() {
  const text = targetConfig.value.trim();
  return !text || text === '{}';
}

function updateTargetConfigGuide() {
  if (targetConfigGuide) {
    targetConfigGuide.textContent = t(targetConfigGuideKey(), 'Optional. Keep empty unless this target needs headers, tags, or notes.');
  }

  if (isBlankTargetConfig()) {
    targetConfig.placeholder = JSON.stringify(targetConfigTemplate(), null, 2);
  }
}

function fillTargetConfigTemplate() {
  targetConfig.value = JSON.stringify(targetConfigTemplate(), null, 2);
  targetConfig.focus();
}

function formatTargetConfig() {
  try {
    targetConfig.value = JSON.stringify(readTargetConfig(), null, 2);
    setStatus(t('target.configFormatted', 'Target config formatted'), 'passed');
  } catch {
    setStatus(t('target.invalidConfig', 'Target config must be valid JSON'), 'failed');
  }
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
  const typeInfo = suiteTypeConfig[suiteType.value] || suiteTypeConfig.custom;
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
  suiteType.value = suiteTypeConfig[type] ? type : 'custom';
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
  setSuiteType('custom');
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
  setSuiteType(suite.type || 'custom', suite.config || {});
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
  updateTargetConfigGuide();
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
    renderProjects();
    updateWorkspaceTitle();
    return;
  }

  siteUrl.value = project.baseUrl;
  projectSelectedMeta.textContent = `${project.environment.toUpperCase()} | ${project.baseUrl}`;
  fillProjectForm(project);
  projectSelectedMeta.textContent = `${project.environment.toUpperCase()} | ${project.baseUrl}`;
  renderProjects();
  updateWorkspaceTitle();
  loadRuns().catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
  loadSuites(project.id).catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
  loadTargets(project.id).catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
}

async function loadSidebarSuites() {
  if (!projectState.projects.length) {
    sidebarState.suitesByProject = {};
    return;
  }

  const entries = await Promise.all(
    projectState.projects.map(async (project) => {
      try {
        const suites = await requestJson(`/api/test-suites?projectId=${encodeURIComponent(project.id)}`);
        return [project.id, suites];
      } catch {
        return [project.id, []];
      }
    })
  );

  sidebarState.suitesByProject = Object.fromEntries(entries);
}

function renderSidebarWorkspace() {
  if (!sidebarProjectList) {
    return;
  }

  sidebarProjectList.innerHTML = '';

  if (!projectState.projects.length) {
    sidebarProjectList.innerHTML = `<span>${escapeHtml(t('projects.empty', 'No projects yet.'))}</span>`;
    return;
  }

  for (const project of projectState.projects) {
    const group = document.createElement('section');
    group.className = `sidebar-project-group${project.id === projectState.selectedId ? ' active' : ''}`;

    const header = document.createElement('div');
    header.className = 'sidebar-project-header';
    header.innerHTML = `
      <button type="button" class="sidebar-project-main">
        <span class="sidebar-folder-icon" aria-hidden="true"></span>
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${escapeHtml(compactEnvironmentLabel(project.environment || project.baseUrl))}</small>
        </span>
      </button>
      <span class="sidebar-row-actions">
        <button type="button" class="sidebar-icon-action" data-action="add-suite" title="${escapeHtml(t('sidebar.addItem', 'Add item'))}">+</button>
        <button type="button" class="sidebar-icon-action danger" data-action="delete-project" title="${escapeHtml(t('projects.delete', 'Delete project'))}">×</button>
      </span>
    `;

    header.querySelector('.sidebar-project-main').addEventListener('click', () => {
      selectProject(project.id);
      showPage('run');
    });
    header.querySelector('[data-action="add-suite"]').addEventListener('click', (event) => {
      event.stopPropagation();
      createSidebarSuite(project.id);
    });
    header.querySelector('[data-action="delete-project"]').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteProjectById(project.id);
    });
    group.appendChild(header);

    if (project.id === projectState.selectedId) {
      const list = document.createElement('div');
      list.className = 'sidebar-thread-list';
      const suites = getSidebarSuites(project.id);

      if (!suites.length) {
        list.innerHTML = `<span class="sidebar-empty-thread">${escapeHtml(t('sidebar.noItems', 'No items'))}</span>`;
      } else {
        for (const suite of suites) {
          const item = document.createElement('div');
          item.tabIndex = 0;
          item.role = 'button';
          item.className = `sidebar-thread-item${suite.id === suiteState.selectedId ? ' active' : ''}`;
          item.innerHTML = `
            <span>
              <strong>${escapeHtml(suite.name)}</strong>
              <small>${escapeHtml(suite.type || 'custom')}</small>
            </span>
            <button type="button" class="sidebar-icon-action danger" title="${escapeHtml(t('suite.delete', 'Delete item'))}">×</button>
          `;
          item.addEventListener('click', () => openWorkspaceItem(project.id, suite.id));
          item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openWorkspaceItem(project.id, suite.id);
            }
          });
          item.querySelector('.sidebar-icon-action').addEventListener('click', (event) => {
            event.stopPropagation();
            deleteSuiteById(project.id, suite.id);
          });
          list.appendChild(item);
        }
      }

      group.appendChild(list);
    }
    sidebarProjectList.appendChild(group);
  }
}

function renderProjects() {
  projectList.innerHTML = '';
  if (sidebarProjectList) {
    sidebarProjectList.innerHTML = '';
  }
  projectSelect.innerHTML = `<option value="">${escapeHtml(t('common.manualUrl', 'Manual URL'))}</option>`;
  projectCount.textContent = t('projects.count', '{count} {item}', {
    count: projectState.projects.length,
    item: projectState.projects.length === 1
      ? t('projects.itemSingular', 'project')
      : t('projects.itemPlural', 'projects'),
  });

  if (!projectState.projects.length) {
    projectList.innerHTML = `<p class="empty">${escapeHtml(t('projects.empty', 'No projects yet.'))}</p>`;
    renderSidebarWorkspace();
    projectSelectedMeta.textContent = t('projects.noSelected', 'No project selected');
    updateWorkspaceTitle();
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

  renderSidebarWorkspace();

  if (projectState.selectedId && !getSelectedProject()) {
    projectState.selectedId = '';
  }

  projectSelect.value = projectState.selectedId;
  const selectedProject = getSelectedProject();
  projectSelectedMeta.textContent = selectedProject
    ? `${selectedProject.environment.toUpperCase()} | ${selectedProject.baseUrl}`
    : t('common.manualUrl', 'Manual URL');
  updateWorkspaceTitle();
}

async function loadProjects() {
  const projects = await requestJson('/api/projects');
  projectState.projects = projects;
  await loadSidebarSuites();
  renderProjects();
}

async function openWorkspaceItem(projectIdValue, suiteIdValue) {
  const projectChanged = projectState.selectedId !== projectIdValue;
  const needsSuiteLoad = projectChanged || !suiteState.suites.some((suite) => suite.id === suiteIdValue);

  if (projectChanged) {
    selectProject(projectIdValue);
    await Promise.all([loadTargets(projectIdValue), loadSuites(projectIdValue)]);
  } else if (needsSuiteLoad) {
    await loadSuites(projectIdValue);
  }

  selectSuite(suiteIdValue);
  showPage('run');
  await loadRuns();
  updateWorkspaceTitle();
}

async function createSidebarProject() {
  const name = window.prompt(t('sidebar.projectNamePrompt', 'Project name?'), t('sidebar.newProject', 'New project'));

  if (!name?.trim()) {
    return;
  }

  const project = await requestJson('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      description: '',
      baseUrl: siteUrl.value || 'https://example.com/',
      environment: 'production',
    }),
  });

  await loadProjects();
  selectProject(project.id);
  showPage('run');
  setStatus(t('projects.saved', 'Project saved'), 'passed');
}

async function createSidebarSuite(projectIdValue = projectState.selectedId) {
  const project = projectState.projects.find((item) => item.id === projectIdValue);

  if (!project) {
    setStatus(t('suite.selectProjectStatus', 'Select project'), 'failed');
    return;
  }

  const name = window.prompt(t('sidebar.itemNamePrompt', 'Item name?'), t('sidebar.newItem', 'New test flow'));

  if (!name?.trim()) {
    return;
  }

  const suite = await requestJson('/api/test-suites', {
    method: 'POST',
    body: JSON.stringify({
      projectId: project.id,
      name: name.trim(),
      type: 'custom',
      description: '',
      config: {},
      enabled: true,
    }),
  });

  await loadSidebarSuites();
  await openWorkspaceItem(project.id, suite.id);
  setStatus(t('suite.saved', 'Suite saved'), 'passed');
}

async function deleteProjectById(projectIdValue) {
  const project = projectState.projects.find((item) => item.id === projectIdValue);

  if (!project) {
    return;
  }

  const confirmed = window.confirm(t('projects.confirmDelete', 'Delete project "{name}"?', {
    name: project.name,
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/projects/${encodeURIComponent(project.id)}`, {
    method: 'DELETE',
  });

  if (projectState.selectedId === project.id) {
    projectState.selectedId = '';
    suiteState.selectedId = '';
    suiteState.suites = [];
    targetState.selectedId = '';
    targetState.targets = [];
    caseState.selectedId = '';
    caseState.cases = [];
    resetProjectForm();
    resetSuiteForm();
    resetCaseForm();
    resetTargetForm();
  }

  await loadProjects();
  await loadRuns();
  renderTargets();
  renderSuites();
  renderCases();
  updateWorkspaceTitle();
  setStatus(t('projects.deleted', 'Project deleted'), 'passed');
}

async function deleteSuiteById(projectIdValue, suiteIdValue) {
  const suite = getSidebarSuites(projectIdValue).find((item) => item.id === suiteIdValue);

  if (!suite) {
    return;
  }

  const confirmed = window.confirm(t('suite.confirmDelete', 'Delete suite "{name}"?', {
    name: suite.name,
  }));

  if (!confirmed) {
    return;
  }

  await requestJson(`/api/test-suites/${encodeURIComponent(suite.id)}`, {
    method: 'DELETE',
  });

  if (suiteState.selectedId === suite.id) {
    suiteState.selectedId = '';
    caseState.selectedId = '';
    caseState.cases = [];
    resetSuiteForm();
    resetCaseForm();
  }

  await loadSidebarSuites();
  if (projectState.selectedId === projectIdValue) {
    await loadSuites(projectIdValue);
  }
  await loadRuns();
  renderProjects();
  renderCases();
  updateWorkspaceTitle();
  setStatus(t('suite.deleted', 'Suite deleted'), 'passed');
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
    renderProjects();
    updateWorkspaceTitle();
    return;
  }

  suiteSelectedMeta.textContent = `${suite.type} | ${suite.enabled ? t('common.enabled', 'enabled') : t('common.disabled', 'disabled')}`;
  fillSuiteForm(suite);
  renderSuites();
  renderProjects();
  updateWorkspaceTitle();
  loadRuns().catch((error) => {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  });
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
  renderProjects();
  updateWorkspaceTitle();
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
  await loadSidebarSuites();
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
  await loadSidebarSuites();
  renderProjects();
  await loadRuns();
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
  await loadRuns();
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
  await loadRuns();
  updateWorkspaceTitle();
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
      ${renderEvidenceImages(testCase)}
      ${testCase.code ? `<pre class="case-code">${escapeHtml(testCase.code)}</pre>` : ''}
      ${testCase.error ? `<pre class="case-error">${escapeHtml(testCase.error)}</pre>` : ''}
    </div>
  `;
}

function renderEvidenceImage(label, value) {
  const src = typeof value === 'string' ? value.trim() : '';

  if (!src) {
    return '';
  }

  const canPreview = /^https?:/i.test(src) || /^data:/i.test(src) || src.startsWith('/api/');

  return `
    <div class="evidence-preview">
      <span>${escapeHtml(label)}</span>
      ${
        canPreview
          ? `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}"></a>`
          : `<strong>${escapeHtml(src)}</strong>`
      }
    </div>
  `;
}

function renderEvidenceImages(testCase) {
  return `
    ${renderEvidenceImage(t('fileFlow.inputImage', 'Input image'), testCase.inputImage)}
    ${renderEvidenceImage(t('fileFlow.actualImage', 'Actual screenshot'), testCase.actualImage)}
  `;
}

function renderCaseFacts(testCase) {
  const facts = [
    [t('fileFlow.caseId', 'Case ID'), testCase.caseId || (testCase.title || '').match(/\b[A-Z]+-\d+\b/)?.[0]],
    [t('fileFlow.module', 'Module'), testCase.module],
    [t('fileFlow.feature', 'Feature'), testCase.feature],
    [t('fileFlow.priority', 'Priority'), testCase.priority],
    [t('fileFlow.severity', 'Severity'), testCase.severity],
    [t('fileFlow.testType', 'Type'), testCase.testType],
    [t('fileFlow.automationCandidate', 'Automation'), testCase.automationCandidate],
    [t('flow.goal', 'Goal'), testCase.description],
    [t('fileFlow.preconditions', 'Preconditions'), testCase.preconditions],
    [t('fileFlow.testData', 'Test data'), testCase.testData],
    [t('detail.expected', 'Expected'), testCase.expected],
    [t('detail.actual', 'Actual result'), testCase.actual],
    [t('common.duration', 'Duration'), formatDuration(testCase.durationMs)],
    [t('detail.selector', 'Selector'), testCase.selector],
    [t('fileFlow.notes', 'Notes'), testCase.notes],
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
        [t('fileFlow.caseId', 'Case ID'), testCase.caseId || (testCase.title || '').match(/\b[A-Z]+-\d+\b/)?.[0]],
        [t('fileFlow.module', 'Module'), testCase.module],
        [t('fileFlow.feature', 'Feature'), testCase.feature],
        [t('fileFlow.priority', 'Priority'), testCase.priority],
        [t('fileFlow.severity', 'Severity'), testCase.severity],
        [t('fileFlow.testType', 'Type'), testCase.testType],
        [t('fileFlow.automationCandidate', 'Automation'), testCase.automationCandidate],
        [t('flow.goal', 'Goal'), testCase.description],
        [t('fileFlow.preconditions', 'Preconditions'), testCase.preconditions],
        [t('fileFlow.testData', 'Test data'), testCase.testData],
        [t('detail.expected', 'Expected'), testCase.expected],
        [t('detail.actual', 'Actual result'), testCase.actual],
        [t('fileFlow.inputImage', 'Input image'), testCase.inputImage],
        [t('fileFlow.actualImage', 'Actual screenshot'), testCase.actualImage],
        [t('fileFlow.defectId', 'Defect ID'), testCase.defectId],
        [t('common.duration', 'Duration'), formatDuration(testCase.durationMs)],
        [t('detail.selector', 'Selector'), testCase.selector],
        [t('fileFlow.notes', 'Notes'), testCase.notes],
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
    ${renderEvidenceImages(testCase)}
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

function planCaseKey(testCase, index) {
  const code = (testCase.title || '').match(/\b[A-Z]+-\d+\b/)?.[0];
  return `${code || String(index + 1)}:${testCase.title || ''}`;
}

function renderGeneratedPlan(cases = []) {
  generatedPlan.innerHTML = '';
  generatedPlan.classList.remove('is-loading');
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
    const key = planCaseKey(testCase, index);
    const item = document.createElement('article');
    item.className = `plan-card${openPlanCardKeys.has(key) ? ' open' : ''}`;
    item.tabIndex = 0;
    item.testCase = testCase;
    item.dataset.caseKey = key;
    item.style.setProperty('--float-index', String(index % 6));
    item.innerHTML = `
      <span class="plan-main">
        <span>
          <span class="case-node-index">${escapeHtml(testCase.caseId || String(index + 1).padStart(2, '0'))}</span>
          <strong>${escapeHtml(testCase.title || 'Untitled test')}</strong>
          <span class="case-meta-line">
            ${[testCase.module, testCase.feature, testCase.priority, testCase.testType]
              .filter(Boolean)
              .map((value) => `<em>${escapeHtml(value)}</em>`)
              .join('')}
          </span>
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
      if (isOpen) {
        openPlanCardKeys.add(key);
      } else {
        openPlanCardKeys.delete(key);
      }
    };
    item.querySelector('.plan-detail').hidden = !openPlanCardKeys.has(key);
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

function renderPlanLoading(title, detail) {
  generatedPlan.innerHTML = `
    <div class="space-empty loading-empty" aria-live="polite">
      <span class="loading-spinner" aria-hidden="true"></span>
      <strong>${escapeHtml(title || t('flow.loadingTitle', 'Preparing test cases'))}</strong>
      <span>${escapeHtml(detail || t('flow.loadingText', 'AI is generating the plan and the browser run will stream cases here as they finish.'))}</span>
      <span class="loading-lines" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
    </div>
  `;
  generatedPlan.classList.add('is-empty', 'is-loading');
}

function renderAiExplanation(value = '') {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!aiExplanationPanel || !aiExplanationText) {
    return;
  }

  aiExplanationPanel.hidden = !text;
  aiExplanationText.textContent = text;
}

function setRunMode(mode) {
  runModeState.mode = mode === 'auto' ? 'auto' : 'file';
  document.body.dataset.runMode = runModeState.mode;

  if (runModeSwitch) {
    for (const button of runModeSwitch.querySelectorAll('button[data-mode]')) {
      button.classList.toggle('active', button.dataset.mode === runModeState.mode);
    }
  }

  if (generateCaseFileButton) {
    generateCaseFileButton.textContent = runModeState.mode === 'auto'
      ? testcaseFileState.csvContent
        ? t('fileFlow.runImported', 'Run imported')
        : t('fileFlow.import', 'Import CSV')
      : t('fileFlow.generate', 'Generate testcase file');
  }
}

function updateRunWelcomeState(isWorking = false) {
  const hasFile = Boolean(testcaseFileState.csvContent);
  document.body.classList.toggle('has-case-file', hasFile);
  document.body.classList.toggle('is-working', Boolean(isWorking));
}

function toggleCaseDetail(force) {
  if (!testcaseDetailSection) {
    return;
  }

  const shouldShow = typeof force === 'boolean' ? force : testcaseDetailSection.hidden;
  testcaseDetailSection.hidden = !shouldShow;
  testcaseDetailSection.dataset.open = shouldShow ? 'true' : 'false';

  if (viewCaseDetailButton) {
    viewCaseDetailButton.textContent = shouldShow
      ? t('fileFlow.hideDetail', 'Ẩn chi tiết')
      : t('fileFlow.viewDetail', 'Xem chi tiết');
  }
}

function setCaseFileState(result = {}) {
  testcaseFileState.csvContent = result.csvContent || '';
  testcaseFileState.fileName = result.fileName || '';
  testcaseFileState.downloadUrl = result.downloadUrl || '';
  testcaseFileState.excelDownloadUrl = result.excelDownloadUrl || '';
  testcaseFileState.docDownloadUrl = result.docDownloadUrl || '';
  testcaseFileState.rows = Array.isArray(result.rows) ? result.rows : [];
  const count = testcaseFileState.rows.length;

  if (testcaseFileMeta) {
    testcaseFileMeta.textContent = testcaseFileState.fileName
      ? t('fileFlow.loaded', '{file} - {count} rows ready', {
          file: testcaseFileState.fileName,
          count,
        })
      : t('fileFlow.empty', 'No testcase file loaded.');
  }

  if (fileStateCard) {
    fileStateCard.hidden = !testcaseFileState.csvContent;
  }

  if (fileStateTitle) {
    fileStateTitle.textContent = testcaseFileState.fileName || t('fileFlow.empty', 'No testcase file loaded.');
  }

  if (fileStateMeta) {
    fileStateMeta.textContent = testcaseFileState.fileName
      ? t('fileFlow.caseSummary', '{count} test cases ready', { count })
      : t('fileFlow.empty', 'No testcase file loaded.');
  }

  if (downloadCaseFileLink) {
    downloadCaseFileLink.href = testcaseFileState.downloadUrl || '#';
    downloadCaseFileLink.classList.toggle('disabled', !testcaseFileState.downloadUrl);
    downloadCaseFileLink.setAttribute('aria-disabled', String(!testcaseFileState.downloadUrl));
    downloadCaseFileLink.download = testcaseFileState.fileName || '';
  }

  if (downloadCaseExcelLink) {
    downloadCaseExcelLink.href = testcaseFileState.excelDownloadUrl || '#';
    downloadCaseExcelLink.classList.toggle('disabled', !testcaseFileState.excelDownloadUrl);
    downloadCaseExcelLink.setAttribute('aria-disabled', String(!testcaseFileState.excelDownloadUrl));
  }

  if (downloadCaseDocLink) {
    downloadCaseDocLink.href = testcaseFileState.docDownloadUrl || '#';
    downloadCaseDocLink.classList.toggle('disabled', !testcaseFileState.docDownloadUrl);
    downloadCaseDocLink.setAttribute('aria-disabled', String(!testcaseFileState.docDownloadUrl));
  }

  if (runImportedFileButton) {
    runImportedFileButton.disabled = !testcaseFileState.csvContent;
  }

  setRunMode(runModeState.mode);
  updateRunWelcomeState(false);
}

function readSelectedCaseFile() {
  const file = caseFileInput.files?.[0];

  if (!file) {
    throw new Error(t('fileFlow.noFile', 'Choose a CSV file first.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      fileName: file.name,
      csvContent: String(reader.result || ''),
    });
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

async function generateCaseFile() {
  setBusy(true, t('common.generating', 'Generating'));
  setStatusDetail(t('fileFlow.generatingDetail', 'Generating an editable CSV testcase file.'));
  updateRunWelcomeState(true);
  toggleCaseDetail(false);
  renderPlanLoading(
    t('fileFlow.generatingTitle', 'Generating testcase file'),
    t('fileFlow.generatingText', 'AI is preparing cases, then the backend converts them into editable QC files.')
  );
  setProgress('generate', 30);

  try {
    const result = await requestJson('/api/testcase-files/generate', {
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

    setCaseFileState(result);
    renderAiExplanation(result.aiExplanation || '');
    renderGeneratedPlan(result.cases || []);
    toggleCaseDetail(false);
    setStatus(t('common.generated', 'Generated'), 'passed');
    setStatusDetail('');
    setProgress('store', 100);
    await loadRuns();
  } catch (error) {
    generatedCode.value = error.message;
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  } finally {
    updateRunWelcomeState(false);
    setBusy(false, systemStatus.textContent);
    setTimeout(resetProgress, 900);
  }
}

async function importCaseFile() {
  try {
    const selectedFile = await readSelectedCaseFile();
    const result = await requestJson('/api/testcase-files/import', {
      method: 'POST',
      body: JSON.stringify({
        ...selectedFile,
        url: siteUrl.value,
        projectId: projectState.selectedId,
        suiteId: suiteState.selectedId,
        targetId: targetState.selectedId,
      }),
    });
    setCaseFileState(result);
    renderGeneratedPlan(result.cases || []);
    toggleCaseDetail(false);
    setStatus(t('fileFlow.imported', 'CSV imported'), 'passed');
    await loadRuns();
  } catch (error) {
    generatedCode.value = error.message;
    setStatus(t('common.error', 'Error'), 'failed');
  }
}

async function runImportedCaseFile() {
  if (!testcaseFileState.csvContent) {
    setStatus(t('fileFlow.noFile', 'Choose a CSV file first.'), 'failed');
    return;
  }

  setBusy(true, t('common.queued', 'Queued'));
  openPlanCardKeys.clear();
  updateRunWelcomeState(true);
  toggleCaseDetail(true);
  renderPlanLoading(
    t('fileFlow.runningTitle', 'Running imported testcase file'),
    t('fileFlow.runningText', 'The backend is rendering safe Playwright checks from imported CSV rows.')
  );
  setProgress('generate', 15);

  try {
    const run = await requestJson('/api/testcase-files/run', {
      method: 'POST',
      body: JSON.stringify({
        url: siteUrl.value,
        projectId: projectState.selectedId,
        suiteId: suiteState.selectedId,
        targetId: targetState.selectedId,
        csvContent: testcaseFileState.csvContent,
        fileName: testcaseFileState.fileName,
        auth: collectAuth(),
      }),
    });

    updateLatest(run);
    setStatus(t('queue.queued', 'Run queued'), 'queued');
    setProgress('generate', 25);
    await loadRuns();

    const finalRun = await pollRunUntilDone(run.runId || run.id);

    if (finalRun.generatedCode) {
      generatedCode.value = finalRun.generatedCode;
    }

    renderAiExplanation(finalRun.aiExplanation || '');
    renderGeneratedPlan(finalRun.cases || []);
    setProgress('store', 100);
  } catch (error) {
    generatedCode.value = error.message;
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  } finally {
    updateRunWelcomeState(false);
    setBusy(false, systemStatus.textContent);
    setTimeout(resetProgress, 900);
  }
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
  renderAiExplanation(run.aiExplanation || '');
  if (isRunActive(run) && !(run.cases || []).length) {
    renderPlanLoading(
      statusText(run.status),
      t('flow.runningText', 'The run is in progress. Generated cases will appear here as soon as they are available.')
    );
  } else {
    renderGeneratedPlan(run.cases || []);
  }
  setStatus(statusText(run.status), run.status);
  setStatusDetail(describeRunActivity(run));
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

function compactErrorText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\r/g, '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join('\n')
    .slice(0, 1200);
}

function getRunErrorReason(run) {
  if (!['failed', 'cancelled', 'error'].includes(run?.status)) {
    return '';
  }

  return run?.errorReason || compactErrorText(run?.stderr) || compactErrorText(run?.stdout);
}

function renderRunErrorNote(run, className = 'run-error-note') {
  const errorReason = getRunErrorReason(run);

  if (!errorReason) {
    return '';
  }

  return `
    <span class="${className}">
      <strong>${escapeHtml(t('detail.errorReason', 'Error reason'))}</strong>
      <span>${escapeHtml(errorReason)}</span>
    </span>
  `;
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
    const item = document.createElement('article');
    item.className = `history-item ${run.status || 'pending'}`;
    item.dataset.runId = run.id;
    item.innerHTML = `
      <button type="button" class="history-open" aria-label="${escapeHtml(t('history.openDetail', 'Open run detail'))}">
        <span class="run-status ${run.status}">${escapeHtml(statusText(run.status))}</span>
        <span class="history-url">
          <strong class="history-title">${escapeHtml(getRunTitle(run))}</strong>
          <span class="history-kind">${escapeHtml(runKindLabel(run))}</span>
          <strong>${escapeHtml(run.url)}</strong>
          <span>${new Date(run.createdAt).toLocaleString()}</span>
          ${renderRunErrorNote(run, 'history-error-note')}
        </span>
        <span class="history-metrics">
          ${escapeHtml(historyMetricText(run))}
        </span>
      </button>
      ${renderHistoryQuickDownloads(run)}
    `;
    item.querySelector('.history-open').addEventListener('click', () => openRunDetail(run.id));
    historyList.appendChild(item);
  }

  updateLatest(runs[0]);
}

function filterRunsForWorkspace(runs) {
  if (suiteState.selectedId) {
    return runs.filter((run) => run.suiteId === suiteState.selectedId);
  }

  if (projectState.selectedId) {
    return runs.filter((run) => run.projectId === projectState.selectedId);
  }

  return runs;
}

async function loadRuns() {
  const runs = await requestJson('/api/runs');
  historyState.runs = filterRunsForWorkspace(runs);
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
      runButton.textContent = `${t('common.running', 'Running')}...`;
      setStatusDetail(describeRunActivity(run));
      setProgress('run', 70);
    } else if (run.status === 'queued') {
      runButton.textContent = `${t('common.queued', 'Queued')}...`;
      setStatusDetail(describeRunActivity(run));
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
  openPlanCardKeys.clear();
  generateButton.textContent = `${t('common.generating', 'Generating')}...`;
  runButton.textContent = t('common.pleaseWait', 'Please wait');
  refreshButton.textContent = t('common.pleaseWait', 'Please wait');
  setStatusDetail(t('app.status.generatingDetail', 'Generating the Playwright spec and preparing cases.'));
  renderAiExplanation('');
  renderPlanLoading(
    t('flow.loadingTitle', 'Preparing test cases'),
    t('flow.generateLoadingText', 'AI is creating the test cases and Playwright file. Controls are locked until it finishes.')
  );
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
    renderAiExplanation(result.aiExplanation || '');
    renderGeneratedPlan(result.cases || []);
    setStatus(t('common.generated', 'Generated'), 'passed');
    setStatusDetail('');
    setProgress('store', 100);
  } catch (error) {
    generatedCode.value = error.message;
    renderAiExplanation('');
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  } finally {
    setBusy(false, systemStatus.textContent);
    setTimeout(resetProgress, 900);
  }
}

async function runTest() {
  setBusy(true, t('common.queued', 'Queued'));
  openPlanCardKeys.clear();
  runButton.textContent = `${t('common.queued', 'Queued')}...`;
  generateButton.textContent = t('common.pleaseWait', 'Please wait');
  refreshButton.textContent = t('common.pleaseWait', 'Please wait');
  setStatusDetail(t('app.status.queuedDetail', 'Queued. Waiting for the worker to start.'));
  renderAiExplanation('');
  renderPlanLoading(
    t('flow.loadingTitle', 'Preparing test cases'),
    t('flow.runLoadingText', 'AI is creating the suite. When Chromium starts, each case will appear here as it is generated or completed.')
  );
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

    const finalRun = await pollRunUntilDone(run.runId || run.id);

    if (finalRun.generatedCode) {
      generatedCode.value = finalRun.generatedCode;
    }

    renderAiExplanation(finalRun.aiExplanation || '');
    renderGeneratedPlan(finalRun.cases || []);
    setProgress('store', 100);
  } catch (error) {
    generatedCode.value = error.message;
    renderAiExplanation('');
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
      <strong>${escapeHtml(historyMetricText(run))}</strong>
      ${run.suiteName ? `<span>${escapeHtml(run.suiteName)} (${escapeHtml(run.suiteType || 'suite')})</span>` : ''}
      ${run.targetName ? `<span>${escapeHtml(run.targetName)} (${escapeHtml(run.targetType || 'target')})</span>` : ''}
      <span>${new Date(run.createdAt).toLocaleString()}</span>
      <span class="history-kind">${escapeHtml(runKindLabel(run))}</span>
      ${renderDownloadGroup(t('fileFlow.downloadSourceGroup', 'Testcase file'), [
        { href: run.testcaseCsvUrl, label: t('fileFlow.downloadSourceCsv', 'Source CSV') },
        { href: run.testcaseExcelUrl, label: t('fileFlow.downloadSourceExcel', 'Source Excel') },
        { href: run.testcaseDocUrl, label: t('fileFlow.downloadSourceDoc', 'Source Word') },
      ])}
      ${renderDownloadGroup(t('fileFlow.downloadResultGroup', 'Auto test result'), [
        { href: run.resultCsvUrl, label: t('fileFlow.downloadResultCsv', 'Result CSV') },
        { href: run.resultExcelUrl, label: t('fileFlow.downloadResultExcelShort', 'Result Excel') },
        { href: run.resultDocUrl, label: t('fileFlow.downloadResultDocShort', 'Result Word') },
      ])}
    `;
    caseList.innerHTML = `
      ${run.aiExplanation ? `
        <div class="ai-explanation-panel detail-ai-explanation">
          <strong>${escapeHtml(t('flow.aiExplanationTitle', 'AI explanation'))}</strong>
          <p>${escapeHtml(run.aiExplanation)}</p>
        </div>
      ` : ''}
      ${renderRunErrorNote(run)}
    `;

    if (!run.cases?.length) {
      caseList.innerHTML += `<p class="empty">${escapeHtml(t('detail.noStored', 'No case detail was stored for this run.'))}</p>`;
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
    renderAiExplanation('');
    renderGeneratedPlan([]);
    setStatus(t('common.error', 'Error'), 'failed');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generateCaseFile();
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
newSidebarProjectButton?.addEventListener('click', createSidebarProject);
newSidebarItemButton?.addEventListener('click', () => createSidebarSuite(projectState.selectedId));
projectSelect.addEventListener('change', () => selectProject(projectSelect.value));
suiteSelect.addEventListener('change', () => selectSuite(suiteSelect.value));
targetSelect.addEventListener('change', () => selectTarget(targetSelect.value));
selectionToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  setSelectionPopover(selectionPopover.hidden);
});
selectionCloseButton.addEventListener('click', () => setSelectionPopover(false));
selectionBackdrop.addEventListener('click', () => setSelectionPopover(false));
selectionPopover.addEventListener('click', (event) => {
  event.stopPropagation();
});
actionMenu.addEventListener('click', (event) => {
  event.stopPropagation();
});
document.addEventListener('click', (event) => {
  if (!selectionPopover.hidden) {
    setSelectionPopover(false);
  }

  if (actionMenu.open && !actionMenu.contains(event.target)) {
    actionMenu.open = false;
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !selectionPopover.hidden) {
    setSelectionPopover(false);
  }

  if (event.key === 'Escape' && actionMenu.open) {
    actionMenu.open = false;
  }
});
targetType.addEventListener('change', updateTargetTypeFields);
targetConfigTemplateButton.addEventListener('click', fillTargetConfigTemplate);
targetConfigFormatButton.addEventListener('click', formatTargetConfig);
suiteTypeMenu.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-suite-type]');

  if (!button) {
    return;
  }

  setSuiteType(button.dataset.suiteType);
});
suiteType.addEventListener('change', () => setSuiteType(suiteType.value));
authMode.addEventListener('change', updateAuthFields);
for (const element of [projectSelectedMeta, suiteSelectedMeta, targetSelectedMeta]) {
  new MutationObserver(updateSelectionSummary).observe(element, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}
generateButton.addEventListener('click', generateOnly);
generateCaseFileButton.addEventListener('click', () => {
  if (runModeState.mode === 'auto') {
    if (testcaseFileState.csvContent) {
      runImportedCaseFile();
      return;
    }

    caseFileInput.click();
    return;
  }

  generateCaseFile();
});
caseFileInput.addEventListener('change', importCaseFile);
runImportedFileButton.addEventListener('click', runImportedCaseFile);
viewCaseDetailButton.addEventListener('click', () => toggleCaseDetail());
runModeSwitch.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-mode]');

  if (!button) {
    return;
  }

  setRunMode(button.dataset.mode);
});
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
  setSuiteType('custom');
  setRunMode('file');
  toggleCaseDetail(false);
  updateRunWelcomeState(false);
  await Promise.all([loadProjects(), loadRuns()]);
  updateSelectionSummary();
}

initApp().catch((error) => {
  generatedCode.value = error.message;
  renderGeneratedPlan([]);
  setStatus(t('common.error', 'Error'), 'failed');
});
