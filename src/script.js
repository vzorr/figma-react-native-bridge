// Enhanced global state management
let currentState = {
  view: 'dashboard', // 'dashboard', 'flow-detail'
  viewMode: 'grid', // 'grid', 'diagram'
  flows: [],
  selectedFlow: null,
  selectedScreen: null,
  detectedRoles: [],
  theme: null,
  generatedFiles: {},
  selectedGenerationOption: 'complete-flow',
  currentFile: null
};

// Global function definitions - explicitly in global scope
window.detectFlows = function() {
  console.log('detectFlows called - Global function');  
  showLoading('Analyzing flows and detecting user roles...');
  parent.postMessage({ pluginMessage: { type: 'detect-flows' } }, '*');
};

window.extractSimpleTokens = function() {
  console.log('extractSimpleTokens called - Global function');
  showLoading('Extracting design tokens...');
  parent.postMessage({ pluginMessage: { type: 'extract-tokens' } }, '*');
};

window.selectFlow = function(flowId) {
  const flow = currentState.flows.find(f => f.id === flowId);
  if (!flow) return;
  
  currentState.selectedFlow = flow;
  currentState.selectedScreen = null;
  
  showFlowDetail(flow);
  showView('flow-detail');
  
  if (currentState.viewMode === 'diagram') {
    generateFlowDiagram(flow);
  }
};

window.selectScreen = function(screenName) {
  if (!currentState.selectedFlow) return;
  
  const screen = currentState.selectedFlow.screens.find(s => s.name === screenName);
  if (!screen) return;
  
  currentState.selectedScreen = screen;
  
  // Update screen selection UI
  document.querySelectorAll('.screen-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(`[data-screen="${screenName}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  // Enable screen-specific actions
  const generateScreenBtn = document.getElementById('generateScreenBtn');
  if (generateScreenBtn) {
    generateScreenBtn.disabled = false;
  }
  
  updateBreadcrumb();
  
  // Update flow diagram selection
  if (currentState.viewMode === 'diagram') {
    updateDiagramSelection(screenName);
  }
};

window.generateSelectedOption = function() {
  if (!currentState.selectedFlow) return;
  
  const option = currentState.selectedGenerationOption;
  
  switch (option) {
    case 'complete-flow':
      generateCompleteFlowPackage();
      break;
    case 'individual-screen':
      if (currentState.selectedScreen) {
        generateScreenCode();
      } else {
        showError('Please select a screen first');
      }
      break;
    case 'theme-only':
      exportFlowTheme();
      break;
    case 'project-structure':
      generateProjectStructure();
      break;
  }
};

window.generateScreenCode = function() {
  if (!currentState.selectedScreen || !currentState.selectedFlow) return;
  
  showLoading('Generating React Native screen code...');
  parent.postMessage({ 
    pluginMessage: { 
      type: 'generate-screen-code',
      flowId: currentState.selectedFlow.id,
      screenName: currentState.selectedScreen.name
    } 
  }, '*');
};

window.exportFlowTheme = function() {
  if (!currentState.selectedFlow) return;
  
  showLoading('Generating flow-specific theme...');
  parent.postMessage({ 
    pluginMessage: { 
      type: 'export-flow-theme',
      flowId: currentState.selectedFlow.id 
    } 
  }, '*');
};

window.showDashboard = function() {
  currentState.selectedFlow = null;
  currentState.selectedScreen = null;
  showView('dashboard');
};

window.setViewMode = function(mode) {
  currentState.viewMode = mode;
  updateViewButtons();
  
  if (currentState.selectedFlow) {
    if (mode === 'diagram') {
      document.getElementById('flowDiagramSection').style.display = 'block';
      generateFlowDiagram(currentState.selectedFlow);
    } else {
      document.getElementById('flowDiagramSection').style.display = 'none';
    }
  }
};

window.closeCodeModal = function() {
  document.getElementById('codeModal').style.display = 'none';
};

window.switchFileTab = function(fileName) {
  const content = currentState.generatedFiles[fileName];
  if (!content) return;
  
  // Update active tab
  document.querySelectorAll('.file-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.file === fileName) {
      tab.classList.add('active');
    }
  });
  
  // Update content with basic syntax highlighting
  const codePreview = document.getElementById('codePreview');
  codePreview.innerHTML = applySyntaxHighlighting(content, getFileExtension(fileName));
  
  currentState.currentFile = fileName;
};

window.copyCode = function() {
  const fileName = currentState.currentFile;
  const content = currentState.generatedFiles[fileName];
  if (content) {
    navigator.clipboard.writeText(content).then(() => {
      showSuccess(`✅ ${fileName} copied to clipboard!`);
    }).catch(() => {
      showError('❌ Failed to copy code');
    });
  }
};

window.downloadCurrentFile = function() {
  const fileName = currentState.currentFile;
  const content = currentState.generatedFiles[fileName];
  if (content) {
    downloadFile(content, fileName);
    showSuccess(`✅ Downloaded ${fileName}`);
  }
};

window.downloadAllFiles = function() {
  // In a real implementation, this would create a zip file
  // For now, we'll download files individually
  Object.entries(currentState.generatedFiles).forEach(([fileName, content]) => {
    setTimeout(() => downloadFile(content, fileName), 100);
  });
  showSuccess(`✅ Downloaded ${Object.keys(currentState.generatedFiles).length} files`);
};

window.copyPackageStructure = function() {
  const structure = generatePackageStructure();
  navigator.clipboard.writeText(structure).then(() => {
    showSuccess('✅ Project structure copied to clipboard!');
  }).catch(() => {
    showError('❌ Failed to copy structure');
  });
};

window.refreshSelection = function() {
  parent.postMessage({ pluginMessage: { type: 'refresh-selection' } }, '*');
};

window.checkSelection = function() {
  window.refreshSelection();
};

// Internal helper functions
function generateCompleteFlowPackage() {
  if (!currentState.selectedFlow) return;
  
  showLoading('Generating complete React Native flow package...');
  parent.postMessage({ 
    pluginMessage: { 
      type: 'generate-flow-code',
      flowId: currentState.selectedFlow.id,
      includeNavigation: true,
      includeTheme: true,
      includeTypes: true
    } 
  }, '*');
}

function generateProjectStructure() {
  if (!currentState.selectedFlow) return;
  
  showLoading('Generating project structure...');
  parent.postMessage({ 
    pluginMessage: { 
      type: 'generate-project-structure',
      flowId: currentState.selectedFlow.id
    } 
  }, '*');
}

// View management
function showView(viewName) {
  // Hide all views
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('flowDetailView').style.display = 'none';
  document.getElementById('loadingView').style.display = 'none';
  
  // Show selected view
  document.getElementById(viewName + 'View').style.display = 'block';
  currentState.view = viewName;
  
  updateBreadcrumb();
  updateViewToggle();
}

function updateViewButtons() {
  document.getElementById('gridViewBtn').classList.toggle('active', currentState.viewMode === 'grid');
  document.getElementById('diagramViewBtn').classList.toggle('active', currentState.viewMode === 'diagram');
}

function updateViewToggle() {
  const toggle = document.getElementById('viewToggle');
  toggle.style.display = currentState.view === 'flow-detail' ? 'flex' : 'none';
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let html = '<span class="breadcrumb-item" data-action="showDashboard">Flows</span>';
  
  if (currentState.selectedFlow) {
    html += '<span class="breadcrumb-separator">›</span>';
    html += `<span class="breadcrumb-item">${currentState.selectedFlow.name}</span>`;
  }
  
  if (currentState.selectedScreen) {
    html += '<span class="breadcrumb-separator">›</span>';
    html += `<span class="breadcrumb-item">${currentState.selectedScreen.name}</span>`;
  }
  
  breadcrumb.innerHTML = html;
}

function showLoading(message) {
  document.getElementById('loadingMessage').textContent = message;
  showView('loading');
  
  // Disable buttons
  const detectBtn = document.getElementById('detectFlowsBtn');
  const extractBtn = document.getElementById('extractTokensBtn');
  if (detectBtn) detectBtn.disabled = true;
  if (extractBtn) extractBtn.disabled = true;
}

function hideLoading() {
  // Re-enable buttons
  const detectBtn = document.getElementById('detectFlowsBtn');
  const extractBtn = document.getElementById('extractTokensBtn');
  if (detectBtn) detectBtn.disabled = false;
  if (extractBtn) extractBtn.disabled = false;
}

function updateProgress(progress, message) {
  const progressBar = document.getElementById('globalProgress');
  const progressFill = document.getElementById('globalProgressFill');
  
  if (progress > 0) {
    progressBar.style.display = 'block';
    progressFill.style.width = progress + '%';
  } else {
    progressBar.style.display = 'none';
  }
  
  if (message) {
    document.getElementById('loadingMessage').textContent = message;
  }
}

// Enhanced generation options
function setupGenerationOptions() {
  const options = document.querySelectorAll('.option-card');
  options.forEach(option => {
    option.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      currentState.selectedGenerationOption = option.dataset.option;
      
      // Update button text
      const btn = document.getElementById('generateSelectedBtn');
      const optionTitle = option.querySelector('.option-title').textContent;
      btn.textContent = `🚀 Generate ${optionTitle}`;
    });
  });
}

// Enhanced display functions
function displayFlows(flowsData) {
  currentState.flows = flowsData.flows || [];
  currentState.detectedRoles = flowsData.userRoles || [];
  currentState.theme = flowsData.theme;
  
  const flowsContainer = document.getElementById('flowsContainer');
  const flowsGrid = document.getElementById('flowsGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (currentState.flows.length === 0) {
    flowsContainer.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = `
      <div class="empty-state-icon">😅</div>
      <div class="empty-state-title">No Flows Detected</div>
      <div class="empty-state-description">
        We couldn't detect any user flows in your design. Try using consistent naming patterns like "Customer_Onboarding_1" or organize screens in folders by user role.
      </div>
    `;
    return;
  }
  
  emptyState.style.display = 'none';
  flowsContainer.style.display = 'block';
  
  // Update dashboard stats
  const stats = document.getElementById('dashboardStats');
  stats.innerHTML = `
    <div class="stat-item">
      <span>🎯</span>
      <span>${currentState.flows.length} Flows</span>
    </div>
    <div class="stat-item">
      <span>👥</span>
      <span>${currentState.detectedRoles.length} User Roles</span>
    </div>
    <div class="stat-item">
      <span>📱</span>
      <span>${flowsData.analysis?.overview?.totalScreens || 0} Screens</span>
    </div>
  `;
  
  // Generate flow cards
  flowsGrid.innerHTML = currentState.flows.map(flow => `
    <div class="flow-card" data-action="selectFlow" data-flow-id="${flow.id}">
      <div class="flow-type-indicator type-${flow.flowType}"></div>
      <div class="flow-card-header">
        <h3 class="flow-title">${flow.name}</h3>
        <span class="flow-role-badge role-${flow.userRole.type}">
          ${getRoleIcon(flow.userRole.type)} ${flow.userRole.type}
        </span>
      </div>
      <div class="flow-meta">
        <div class="flow-meta-item">
          <span>📱</span>
          <span>${flow.deviceTargets.join(', ')}</span>
        </div>
        <div class="flow-meta-item">
          <span>🔢</span>
          <span>${flow.screens.length} screens</span>
        </div>
        <div class="flow-meta-item">
          <span>⏱️</span>
          <span>~${Math.round((flow.estimatedDuration || 300) / 60)} min</span>
        </div>
      </div>
      <div class="flow-description">
        ${getFlowDescription(flow.flowType, flow.userRole.type)}
      </div>
    </div>
  `).join('');
}

function showFlowDetail(flow) {
  const header = document.getElementById('flowDetailHeader');
  const screensGrid = document.getElementById('screensGrid');
  const screenCount = document.getElementById('screenCount');
  
  // Update flow header
  header.innerHTML = `
    <h2 class="flow-detail-title">${flow.name}</h2>
    <div class="flow-detail-meta">
      <div class="flow-meta-item">
        <span>👤</span>
        <span>${flow.userRole.name} Role</span>
      </div>
      <div class="flow-meta-item">
        <span>🎯</span>
        <span>${flow.flowType.replace('_', ' ')}</span>
      </div>
      <div class="flow-meta-item">
        <span>📱</span>
        <span>${flow.deviceTargets.join(', ')}</span>
      </div>
      <div class="flow-meta-item">
        <span>🚀</span>
        <span>${flow.navigationPattern} navigation</span>
      </div>
    </div>
  `;
  
  // Update screen count
  screenCount.textContent = `${flow.screens.length} screens`;
  
  // Generate enhanced screen cards
  screensGrid.innerHTML = flow.screens.map((screen, index) => `
    <div class="screen-card" data-screen="${screen.name}" data-action="selectScreen" data-screen-name="${screen.name}">
      <div class="screen-preview">
        <div class="screen-mockup ${screen.deviceType}">
          <div class="screen-content">
            ${generateScreenPreview(screen)}
          </div>
        </div>
        <div class="screen-device-indicator">${getDeviceIcon(screen.deviceType)}</div>
      </div>
      <div class="screen-info">
        <h4 class="screen-name">${screen.name}</h4>
        <div class="screen-meta">
          <span>${screen.width}×${screen.height}</span>
          <span>${screen.components?.length || 0} components</span>
        </div>
        <div class="component-analysis">
          <div class="component-tags">
            ${generateComponentTags(screen.components)}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Enhanced screen preview generation
function generateScreenPreview(screen) {
  if (!screen.components || screen.components.length === 0) {
    return '<div style="padding: 20px; text-align: center; color: #999; font-size: 10px;">No components</div>';
  }
  
  let html = '';
  const componentCounts = {};
  
  // Count component types
  screen.components.forEach(comp => {
    const type = comp.semanticType || 'element';
    componentCounts[type] = (componentCounts[type] || 0) + 1;
  });
  
  // Generate preview elements based on component types
  if (componentCounts.navigation || componentCounts.header) {
    html += '<div class="component-preview header"></div>';
  }
  
  if (componentCounts.heading) {
    html += '<div class="component-preview text" style="height: 8px; width: 70%;"></div>';
  }
  
  if (componentCounts.input) {
    html += '<div class="component-preview input"></div>';
    html += '<div class="component-preview input"></div>';
  }
  
  if (componentCounts.button) {
    html += '<div class="component-preview button"></div>';
  }
  
  if (componentCounts.card) {
    html += '<div class="component-preview card"></div>';
    if (componentCounts.card > 1) {
      html += '<div class="component-preview card"></div>';
    }
  }
  
  // Add some text elements
  if (componentCounts.text || componentCounts.label) {
    html += '<div class="component-preview text" style="height: 4px; width: 90%;"></div>';
    html += '<div class="component-preview text" style="height: 4px; width: 60%;"></div>';
  }
  
  return html || '<div class="component-preview text" style="height: 6px; width: 80%;"></div>';
}

function generateComponentTags(components) {
  if (!components || components.length === 0) return '';
  
  const types = new Set();
  components.forEach(comp => {
    if (comp.semanticType) {
      types.add(comp.semanticType);
    }
  });
  
  return Array.from(types).slice(0, 4).map(type => 
    `<span class="component-tag ${type}">${type}</span>`
  ).join('');
}

// Flow diagram generation
function generateFlowDiagram(flow) {
  const diagram = document.getElementById('flowDiagram');
  diagram.innerHTML = '';
  
  const screens = flow.screens;
  if (screens.length === 0) return;
  
  const nodeWidth = 80;
  const nodeHeight = 30;
  const containerWidth = diagram.offsetWidth - 40;
  const containerHeight = diagram.offsetHeight - 40;
  
  // Calculate positions for screens
  const positions = calculateFlowPositions(screens, containerWidth, containerHeight, nodeWidth, nodeHeight);
  
  // Create nodes
  screens.forEach((screen, index) => {
    const node = document.createElement('div');
    node.className = 'flow-node';
    node.textContent = screen.name;
    node.style.left = positions[index].x + 'px';
    node.style.top = positions[index].y + 'px';
    node.style.width = nodeWidth + 'px';
    node.style.height = nodeHeight + 'px';
    node.dataset.screen = screen.name;
    node.dataset.action = 'selectScreen';
    node.dataset.screenName = screen.name;
    
    diagram.appendChild(node);
  });
  
  // Create connections
  for (let i = 0; i < screens.length - 1; i++) {
    createConnection(diagram, positions[i], positions[i + 1], nodeWidth, nodeHeight);
  }
}

function calculateFlowPositions(screens, containerWidth, containerHeight, nodeWidth, nodeHeight) {
  const positions = [];
  const screenCount = screens.length;
  
  if (screenCount === 1) {
    positions.push({
      x: (containerWidth - nodeWidth) / 2,
      y: (containerHeight - nodeHeight) / 2
    });
  } else if (screenCount <= 3) {
    // Horizontal layout
    const spacing = (containerWidth - (screenCount * nodeWidth)) / (screenCount + 1);
    screens.forEach((_, index) => {
      positions.push({
        x: spacing + (index * (nodeWidth + spacing)),
        y: (containerHeight - nodeHeight) / 2
      });
    });
  } else {
    // Grid layout
    const cols = Math.ceil(Math.sqrt(screenCount));
    const rows = Math.ceil(screenCount / cols);
    const spacingX = (containerWidth - (cols * nodeWidth)) / (cols + 1);
    const spacingY = (containerHeight - (rows * nodeHeight)) / (rows + 1);
    
    screens.forEach((_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      positions.push({
        x: spacingX + (col * (nodeWidth + spacingX)),
        y: spacingY + (row * (nodeHeight + spacingY))
      });
    });
  }
  
  return positions;
}

function createConnection(container, pos1, pos2, nodeWidth, nodeHeight) {
  const x1 = pos1.x + nodeWidth / 2;
  const y1 = pos1.y + nodeHeight / 2;
  const x2 = pos2.x + nodeWidth / 2;
  const y2 = pos2.y + nodeHeight / 2;
  
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  
  const connection = document.createElement('div');
  connection.className = 'flow-connection';
  connection.style.width = length + 'px';
  connection.style.left = x1 + 'px';
  connection.style.top = y1 + 'px';
  connection.style.transformOrigin = '0 50%';
  connection.style.transform = `rotate(${angle}deg)`;
  
  container.appendChild(connection);
  
  // Add arrow
  const arrow = document.createElement('div');
  arrow.className = 'flow-arrow';
  arrow.style.left = (x2 - 6) + 'px';
  arrow.style.top = (y2 - 4) + 'px';
  
  container.appendChild(arrow);
}

function updateDiagramSelection(screenName) {
  document.querySelectorAll('.flow-node').forEach(node => {
    node.classList.remove('selected');
    if (node.dataset.screen === screenName) {
      node.classList.add('selected');
    }
  });
}

// Enhanced modal with multi-file support
function showCodeModal(title, files, activeFile = null) {
  document.getElementById('modalTitle').textContent = title;
  
  currentState.generatedFiles = files;
  
  // Setup file tabs
  const fileTabs = document.getElementById('fileTabs');
  const fileNames = Object.keys(files);
  
  if (fileNames.length > 1) {
    fileTabs.style.display = 'flex';
    fileTabs.innerHTML = fileNames.map((fileName, index) => `
      <button class="file-tab ${index === 0 || fileName === activeFile ? 'active' : ''}" 
              data-action="switchFileTab" 
              data-file-name="${fileName}"
              data-file="${fileName}">
        ${getFileIcon(fileName)} ${fileName}
      </button>
    `).join('');
  } else {
    fileTabs.style.display = 'none';
  }
  
  // Show first file or active file
  const firstFile = activeFile || fileNames[0];
  if (firstFile) {
    window.switchFileTab(firstFile);
  }
  
  document.getElementById('codeModal').style.display = 'flex';
}

function getFileIcon(fileName) {
  const ext = getFileExtension(fileName);
  const icons = {
    'tsx': '⚛️',
    'ts': '📝',
    'js': '📄',
    'json': '📋',
    'md': '📖',
    'zip': '📦'
  };
  return icons[ext] || '📄';
}

function getFileExtension(fileName) {
  return fileName.split('.').pop().toLowerCase();
}

function applySyntaxHighlighting(code, extension) {
  if (!['tsx', 'ts', 'js', 'json'].includes(extension)) {
    return escapeHtml(code);
  }
  
  let highlighted = escapeHtml(code);
  
  // Basic syntax highlighting patterns
  const patterns = [
    // Keywords
    { regex: /\b(import|export|from|interface|type|class|function|const|let|var|if|else|for|while|return|async|await)\b/g, class: 'code-keyword' },
    // Strings
    { regex: /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, class: 'code-string' },
    // Comments
    { regex: /\/\/.*$/gm, class: 'code-comment' },
    { regex: /\/\*[\s\S]*?\*\//g, class: 'code-comment' },
    // Functions
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, class: 'code-function' },
  ];
  
  patterns.forEach(pattern => {
    highlighted = highlighted.replace(pattern.regex, `<span class="${pattern.class}">$&</span>`);
  });
  
  return highlighted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generatePackageStructure() {
  const files = Object.keys(currentState.generatedFiles);
  const structure = `
📦 React Native Flow Package
├── 📁 src/
│   ├── 📁 screens/
${files.filter(f => f.includes('Screen')).map(f => `│   │   └── 📄 ${f}`).join('\n')}
│   ├── 📁 navigation/
${files.filter(f => f.includes('Navigator')).map(f => `│   │   └── 📄 ${f}`).join('\n')}
│   ├── 📁 theme/
${files.filter(f => f.includes('theme')).map(f => `│   │   └── 📄 ${f}`).join('\n')}
│   └── 📁 types/
${files.filter(f => f.includes('types')).map(f => `│       └── 📄 ${f}`).join('\n')}
└── 📄 package.json
  `.trim();
  
  return structure;
}

function downloadFile(content, fileName) {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showError(`❌ Failed to download ${fileName}`);
  }
}

// Helper functions
function getRoleIcon(roleType) {
  const icons = {
    customer: '👤',
    admin: '🔧',
    operator: '⚙️',
    guest: '👋',
    moderator: '🛡️'
  };
  return icons[roleType] || '👤';
}

function getDeviceIcon(deviceType) {
  const icons = {
    mobile: '📱',
    tablet: '📱',
    desktop: '💻'
  };
  return icons[deviceType] || '📱';
}

function getFlowDescription(flowType, roleType) {
  const descriptions = {
    onboarding: 'Guide users through initial setup and introduction',
    authentication: 'Handle user login, signup, and account verification',
    main_feature: 'Core functionality and primary user interactions',
    settings: 'User preferences and configuration options',
    checkout: 'Purchase flow and payment processing',
    unknown: 'Custom user journey and interactions'
  };
  return descriptions[flowType] || 'User journey and task completion';
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  setTimeout(() => {
    successDiv.style.display = 'none';
  }, 3000);
}

function generateThemeReadme(data) {
  return `# Flow Theme Package

Generated from Figma design: **${data.flowName || 'Unknown Flow'}**

## Installation

\`\`\`bash
npm install react-native-vector-icons
# iOS additional setup required for icons
cd ios && pod install
\`\`\`

## Usage

\`\`\`typescript
import theme from './theme';

// Use in your components
<View style={{
  backgroundColor: theme.COLORS.primary,
  padding: theme.SPACING.md,
  borderRadius: theme.BORDER_RADIUS.lg
}}>
  <Text style={{
    fontSize: theme.TYPOGRAPHY.fontSize.lg,
    color: theme.COLORS.white
  }}>
    Themed Component
  </Text>
</View>
\`\`\`

## Features

- 🎨 Complete design token system
- 📱 Responsive scaling utilities  
- 🎯 Platform-specific adjustments
- 🔧 Helper functions for easy usage

Generated on: ${new Date(data.timestamp || Date.now()).toLocaleString()}
`;
}

// Event delegation for all data-action handlers
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  
  const action = target.dataset.action;
  
  switch (action) {
    case 'detectFlows':
      window.detectFlows();
      break;
    case 'refreshSelection':
      window.refreshSelection();
      break;
    case 'extractSimpleTokens':
      window.extractSimpleTokens();
      break;
    case 'selectFlow':
      const flowId = target.dataset.flowId;
      if (flowId) window.selectFlow(flowId);
      break;
    case 'selectScreen':
      const screenName = target.dataset.screenName;
      if (screenName) window.selectScreen(screenName);
      break;
    case 'generateSelectedOption':
      window.generateSelectedOption();
      break;
    case 'generateScreenCode':
      window.generateScreenCode();
      break;
    case 'exportFlowTheme':
      window.exportFlowTheme();
      break;
    case 'showDashboard':
      window.showDashboard();
      break;
    case 'setViewMode':
      const mode = target.dataset.mode;
      if (mode) window.setViewMode(mode);
      break;
    case 'closeCodeModal':
      window.closeCodeModal();
      break;
    case 'switchFileTab':
      const fileName = target.dataset.fileName;
      if (fileName) window.switchFileTab(fileName);
      break;
    case 'copyCode':
      window.copyCode();
      break;
    case 'downloadCurrentFile':
      window.downloadCurrentFile();
      break;
    case 'downloadAllFiles':
      window.downloadAllFiles();
      break;
    case 'copyPackageStructure':
      window.copyPackageStructure();
      break;
  }
});

// Initialize the UI
document.addEventListener('DOMContentLoaded', function() {
  setupGenerationOptions();
  updateViewButtons();
  console.log('UI initialized successfully');
});

// Enhanced message handling from plugin
window.onmessage = function(event) {
  const msg = event.data.pluginMessage;
  
  switch (msg.type) {
    case 'progress':
      updateProgress(msg.progress, msg.message);
      break;
      
    case 'selection-refreshed':
      const selectionStatus = document.getElementById('selectionStatus');
      if (selectionStatus) {
        const count = msg.data.selectionCount || 0;
        const hasFrames = msg.data.hasFrames || false;
        if (count === 0) {
          selectionStatus.innerHTML = '<span>📌</span><span>No selection</span>';
        } else {
          const frameText = hasFrames ? 'with frames' : 'no frames';
          selectionStatus.innerHTML = `<span>📌</span><span>${count} selected (${frameText})</span>`;
        }
      }
      showSuccess(`🔄 Selection refreshed: ${msg.data.selectionCount || 0} items`);
      break;
      
    case 'flows-detected':
      hideLoading();
      showView('dashboard');
      displayFlows(msg.data);
      showSuccess('🎉 Flows detected successfully!');
      break;
      
    case 'tokens-extracted':
    case 'extraction-complete':
      hideLoading();
      showCodeModal('Design Tokens & Theme', {
        'theme.ts': msg.data.fileContent || msg.data.themeFileContent
      });
      showSuccess('🎉 Design tokens extracted!');
      break;
      
    case 'flow-code-generated':
      hideLoading();
      showView('flow-detail');
      
      // Handle multiple files if provided
      if (msg.data.files) {
        showCodeModal('React Native Flow Package', msg.data.files);
      } else {
        showCodeModal('React Native Flow Code', {
          [`${currentState.selectedFlow?.name || 'Flow'}.tsx`]: msg.data.code
        });
      }
      showSuccess('🎉 Flow code generated!');
      break;
      
    case 'screen-code-generated':
      hideLoading();
      showView('flow-detail');
      showCodeModal('React Native Screen Code', {
        [`${currentState.selectedScreen?.name || 'Screen'}.tsx`]: msg.data.code
      });
      showSuccess('🎉 Screen code generated!');
      break;
      
    case 'flow-theme-exported':
      hideLoading();
      showCodeModal('Flow Theme Package', {
        'theme.ts': msg.data.themeContent,
        'README.md': generateThemeReadme(msg.data)
      });
      showSuccess('🎉 Flow theme exported!');
      break;
      
    case 'project-structure-generated':
      hideLoading();
      showCodeModal('Complete Project Structure', msg.data.files || {});
      showSuccess('🎉 Project structure generated!');
      break;
      
    case 'error':
      hideLoading();
      showView(currentState.view === 'loading' ? 'dashboard' : currentState.view);
      showError(msg.error?.message || msg.error || 'An error occurred');
      break;
  }
};

console.log('All function definitions loaded successfully');