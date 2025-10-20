// Configuring URL and API
const getApiBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    } else {
        return 'https://sde-solver-app.onrender.com';
    }
};

const API_BASE_URL = getApiBaseUrl();

// Pastel colors palette for charts
const PASTEL_COLORS = [
    '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', 
    '#FFD700', '#F0E68C', '#E6E6FA', '#B0E0E6',
    '#FFA07A', '#20B2AA', '#DEB887', '#D8BFD8'
];

feather.replace();

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('data-target');
        showSection(target);
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.remove('active-tab');
        });
        this.classList.add('active-tab');
    });
});

// Mobile menu
document.getElementById('mobileMenuButton').addEventListener('click', function() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
});

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    targetSection.classList.remove('hidden');
    targetSection.classList.add('active');
}

// LaTeX equation formatting - Fix excessive $$
function cleanLatex(content) {
    if (!content) return '';
    
    return content
        .replace(/\$\s*\$/g, '') // Remove empty $$
        .replace(/\\\[\\\]/g, '') // Remove empty \[]
        .replace(/([a-zA-Z])([A-Z])/g, '$1 $2') // Add space between stuck words
        .replace(/\$\s*\\\s*\$/g, '') // Remove $ around LaTeX commands
        .replace(/\\\[/g, '\\[') // Normalize delimiters
        .replace(/\\\]/g, '\\]')
        .trim();
}

// Load example buttons
document.querySelectorAll('.load-example').forEach(btn => {
    btn.addEventListener('click', function() {
        const drift = this.getAttribute('data-drift');
        const diffusion = this.getAttribute('data-diffusion');
        const params = this.getAttribute('data-params');
        const processType = this.getAttribute('data-process-type') || 'custom';
        
        document.getElementById('drift').value = drift;
        document.getElementById('diffusion').value = diffusion;
        document.getElementById('problemDescription').value = params;
        document.getElementById('processType').value = processType;
        
        showSection('solver');
    });
});

// Solve SDE function
async function solveSDE() {
    const btn = document.getElementById('solveBtn');
    const thinkingDiv = document.getElementById('aiThinking');
    const stepsContainer = document.getElementById('solutionSteps');
    const errorContainer = document.getElementById('errorContainer');
    const finalAnswer = document.getElementById('finalAnswer');
    const simulationResult = document.getElementById('simulationResult');

    // Reset state
    btn.disabled = true;
    thinkingDiv.classList.remove('hidden');
    stepsContainer.innerHTML = '';
    errorContainer.classList.add('hidden');
    finalAnswer.classList.add('hidden');
    simulationResult.classList.add('hidden');

    try {
        const equationType = document.querySelector('input[name="equationType"]:checked').value;
        const drift = document.getElementById('drift').value.trim();
        const diffusion = document.getElementById('diffusion').value.trim();
        const initialCondition = document.getElementById('initialCondition').value.trim();
        const timeVariable = document.getElementById('timeVariable').value.trim() || 't';
        const paramsText = document.getElementById('problemDescription').value.trim();

        if (!drift || !diffusion) {
            throw new Error('Please enter both drift and diffusion coefficients');
        }

        let parameters = {};
        if (paramsText) {
            try {
                parameters = JSON.parse(paramsText);
            } catch (e) {
                throw new Error('Invalid JSON in parameters field');
            }
        }

        const requestData = {
            equation_type: equationType,
            drift: drift,
            diffusion: diffusion,
            initial_condition: initialCondition || undefined,
            variables: {
                [timeVariable]: 'variable',
                'x': 'variable',
                'W': 'variable'
            },
            parameters: parameters
        };

        console.log('Sending request to:', `${API_BASE_URL}/solve`);
        console.log('Request data:', requestData);

        const response = await fetch(`${API_BASE_URL}/solve`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received response:', data);
        
        // Display solution steps
        stepsContainer.innerHTML = '';
        if (data.steps && Array.isArray(data.steps)) {
            data.steps.forEach((step, idx) => {
                if (step.title && step.content) {
                    addStep(idx + 1, step.title, step.content);
                }
            });
        }
        
        // Display final solution
        if (data.final_solution) {
            const cleanedSolution = cleanLatex(data.final_solution);
            document.getElementById('finalFormula').innerHTML = `\\[ ${cleanedSolution} \\]`;
            finalAnswer.classList.remove('hidden');
        }

        // Store data for download
        window.currentSolutionData = {
            steps: data.steps,
            final_solution: data.final_solution,
            equation_type: equationType,
            drift: drift,
            diffusion: diffusion,
            parameters: parameters
        };

    } catch (error) {
        console.error('Error:', error);
        errorContainer.classList.remove('hidden');
        errorContainer.innerHTML = `
            <div class="error-message">
                <h4 class="font-bold mb-2 flex items-center">
                    <i data-feather="alert-triangle" class="w-4 h-4 mr-2"></i>
                    Solving Error
                </h4>
                <p>${error.message}</p>
                <p class="text-sm mt-2">Please check your equation syntax and try again.</p>
            </div>
        `;
        feather.replace();
    } finally {
        btn.disabled = false;
        thinkingDiv.classList.add('hidden');
        feather.replace();
        // Re-trigger MathJax rendering
        if (typeof MathJax !== 'undefined') {
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }
    }
}

// Simulate SDE function
async function simulateSDE() {
    const btn = document.getElementById('simulateBtn');
    const thinkingDiv = document.getElementById('aiThinking');
    const errorContainer = document.getElementById('errorContainer');
    const simulationResult = document.getElementById('simulationResult');
    const finalAnswer = document.getElementById('finalAnswer');

    // Reset state
    btn.disabled = true;
    thinkingDiv.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    simulationResult.classList.add('hidden');
    finalAnswer.classList.add('hidden');

    try {
        const equationType = document.querySelector('input[name="equationType"]:checked').value;
        const drift = document.getElementById('drift').value.trim();
        const diffusion = document.getElementById('diffusion').value.trim();
        const initialCondition = document.getElementById('initialCondition').value.trim();
        const timeStart = parseFloat(document.getElementById('timeStart').value);
        const timeEnd = parseFloat(document.getElementById('timeEnd').value);
        const numTrajectories = parseInt(document.getElementById('numTrajectories').value);
        const paramsText = document.getElementById('problemDescription').value.trim();
        const processType = document.getElementById('processType').value;

        if (!drift || !diffusion) {
            throw new Error('Please enter both drift and diffusion coefficients');
        }

        if (timeStart >= timeEnd) {
            throw new Error('Time end must be greater than time start');
        }

        let parameters = {};
        if (paramsText) {
            try {
                parameters = JSON.parse(paramsText);
            } catch (e) {
                throw new Error('Invalid JSON in parameters field');
            }
        }

        const requestData = {
            equation_type: equationType,
            drift: drift,
            diffusion: diffusion,
            initial_condition: initialCondition,
            parameters: parameters,
            time_span: [timeStart, timeEnd],
            num_points: 100,
            num_trajectories: numTrajectories,
            process_type: processType
        };

        console.log('Sending simulation request to:', `${API_BASE_URL}/simulate`);
        console.log('Request data:', requestData);

        const response = await fetch(`${API_BASE_URL}/simulate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received simulation response:', data);
        
        // Display simulation plot using Plotly with pastel colors
        displaySimulationPlot(data);

    } catch (error) {
        console.error('Error:', error);
        errorContainer.classList.remove('hidden');
        errorContainer.innerHTML = `
            <div class="error-message">
                <h4 class="font-bold mb-2 flex items-center">
                    <i data-feather="alert-triangle" class="w-4 h-4 mr-2"></i>
                    Simulation Error
                </h4>
                <p>${error.message}</p>
                <p class="text-sm mt-2">Please check your parameters and try again.</p>
            </div>
        `;
        feather.replace();
    } finally {
        btn.disabled = false;
        thinkingDiv.classList.add('hidden');
        feather.replace();
    }
}

function displaySimulationPlot(data) {
    const plotDiv = document.getElementById('simulationPlot');
    const simulationResult = document.getElementById('simulationResult');
    
    // Clear previous plot
    plotDiv.innerHTML = '';
    
    // Create traces for each trajectory with pastel colors
    const traces = [];
    data.trajectories.forEach((trajectory, index) => {
        const color = data.colors && data.colors[index] ? data.colors[index] : PASTEL_COLORS[index % PASTEL_COLORS.length];
        traces.push({
            x: data.time_points,
            y: trajectory,
            type: 'scatter',
            mode: 'lines',
            name: `Trajectory ${index + 1}`,
            line: { color: color, width: 2 },
            opacity: 0.8
        });
    });
    
    // Layout with Palatino font and custom styling
    const layout = {
        font: {
            family: 'Palatino, serif',
            size: 14,
            color: 'black'
        },
        title: {
            text: 'SDE Simulation',
            font: { size: 18, family: 'Palatino, serif' }
        },
        xaxis: {
            title: 'Time (t)',
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        yaxis: {
            title: 'X(t)',
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        showlegend: true,
        annotations: [{
            x: 0.02,
            y: 0.98,
            xref: 'paper',
            yref: 'paper',
            text: 'SDE Solver by Ramanambonona Ambinintsoa, PhD',
            showarrow: false,
            font: { family: 'Palatino, serif', size: 12 },
            bgcolor: 'white',
            bordercolor: 'black',
            borderwidth: 1,
            borderpad: 4,
            opacity: 0.8
        }]
    };
    
    // Create plot
    Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawclosedpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false
    });
    
    simulationResult.classList.remove('hidden');
}

function downloadPlot() {
    const plotDiv = document.getElementById('simulationPlot');
    Plotly.downloadImage(plotDiv, {
        format: 'png',
        filename: 'sde_simulation',
        width: 1000,
        height: 600
    });
}

// Download results as PDF
async function downloadPDF() {
    if (!window.currentSolutionData) {
        alert('No solution to download. Please solve an SDE first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/download-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(window.currentSolutionData)
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        // Download PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `sde_solution_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('PDF download error:', error);
        alert('Error generating PDF: ' + error.message);
    }
}

// Download results as LaTeX
async function downloadLaTeX() {
    if (!window.currentSolutionData) {
        alert('No solution to download. Please solve an SDE first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/download-latex`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(window.currentSolutionData)
        });

        if (!response.ok) {
            throw new Error('Failed to generate LaTeX file');
        }

        // Download LaTeX file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `sde_solution_${Date.now()}.tex`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('LaTeX download error:', error);
        alert('Error generating LaTeX file: ' + error.message);
    }
}

// Helper functions
function addStep(number, title, content) {
    const stepsContainer = document.getElementById('solutionSteps');
    const step = document.createElement('div');
    step.className = 'solution-step p-4 bg-white rounded-lg shadow-sm';
    
    // Clean LaTeX content
    const cleanedContent = cleanLatex(content);
    
    step.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
                <span class="bg-teal-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">${number}</span>
                <span class="font-semibold text-gray-800">${title}</span>
            </div>
            <button class="expand-btn" onclick="toggleStep(this)">
                Expand
            </button>
        </div>
        <div class="formula-box collapsed">
            \\[ ${cleanedContent} \\]
        </div>
    `;
    
    stepsContainer.appendChild(step);
    
    // Animation
    step.style.opacity = '0';
    step.style.transform = 'translateY(20px)';
    setTimeout(() => {
        step.style.transition = 'all 0.4s ease';
        step.style.opacity = '1';
        step.style.transform = 'translateY(0)';
    }, 100 * number);
}

function toggleStep(button) {
    const formulaBox = button.closest('.solution-step').querySelector('.formula-box');
    const isCollapsed = formulaBox.classList.contains('collapsed');
    
    formulaBox.classList.toggle('collapsed');
    button.textContent = isCollapsed ? 'Collapse' : 'Expand';
}

function toggleAllBoxes() {
    const toggleBtn = document.getElementById('toggleAllText');
    const boxes = document.querySelectorAll('.formula-box');
    const expandBtns = document.querySelectorAll('.expand-btn');
    
    const allExpanded = Array.from(boxes).every(box => !box.classList.contains('collapsed'));
    
    boxes.forEach(box => {
        if (allExpanded) {
            box.classList.add('collapsed');
        } else {
            box.classList.remove('collapsed');
        }
    });
    
    expandBtns.forEach(btn => {
        btn.textContent = allExpanded ? 'Expand' : 'Collapse';
    });
    
    toggleBtn.textContent = allExpanded ? 'Expand All' : 'Collapse All';
}

// Process type selector configuration
function setupProcessSelector() {
    const processSelect = document.getElementById('processType');
    
    processSelect.addEventListener('change', function() {
        const selectedProcess = this.value;
        
        // Update fields based on process type
        updateProcessFields(selectedProcess);
    });
}

function updateProcessFields(processType) {
    const defaultParams = {
        'custom': '{"mu": 0.1, "sigma": 0.2}',
        'geometric_brownian': '{"mu": 0.1, "sigma": 0.2, "S0": 100}',
        'ornstein_uhlenbeck': '{"theta": 1.0, "mu": 0.0, "sigma": 0.5, "x0": 0}',
        'vasicek': '{"a": 0.1, "b": 0.05, "sigma": 0.02, "r0": 0.05}',
        'cir': '{"a": 0.1, "b": 0.05, "sigma": 0.1, "r0": 0.05}',
        'brownian': '{}',
        'exponential_martingale': '{"mu": 0, "sigma": 0.2}',
        'poisson': '{"lambd": 1.0}',
        'jump_diffusion': '{"mu": 0.1, "sigma": 0.2, "lambd": 0.5, "jump_mean": 0, "jump_std": 0.1, "S0": 100}'
    };

    const defaultDrift = {
        'custom': 'mu*x',
        'geometric_brownian': 'mu*x',
        'ornstein_uhlenbeck': 'theta*(mu - x)',
        'vasicek': 'a*(b - x)',
        'cir': 'a*(b - x)',
        'brownian': '0',
        'exponential_martingale': '0',
        'poisson': '0',
        'jump_diffusion': 'mu*x'
    };

    const defaultDiffusion = {
        'custom': 'sigma*x',
        'geometric_brownian': 'sigma*x',
        'ornstein_uhlenbeck': 'sigma',
        'vasicek': 'sigma',
        'cir': 'sigma*sqrt(x)',
        'brownian': '1',
        'exponential_martingale': 'sigma*x',
        'poisson': '1',
        'jump_diffusion': 'sigma*x'
    };

    if (defaultParams[processType]) {
        document.getElementById('problemDescription').value = defaultParams[processType];
    }
    if (defaultDrift[processType]) {
        document.getElementById('drift').value = defaultDrift[processType];
    }
    if (defaultDiffusion[processType]) {
        document.getElementById('diffusion').value = defaultDiffusion[processType];
    }
}

// Load examples from API
async function loadExamples() {
    try {
        const response = await fetch(`${API_BASE_URL}/examples`);
        const examples = await response.json();
        
        // Update examples in UI
        updateExamplesUI(examples);
    } catch (error) {
        console.error('Error loading examples:', error);
    }
}

function updateExamplesUI(examples) {
    const examplesContainer = document.getElementById('examplesContainer');
    if (!examplesContainer) return;
    
    let examplesHTML = '';
    
    for (const [key, example] of Object.entries(examples)) {
        examplesHTML += `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <div class="bg-teal-600 text-white p-4">
                    <h3 class="font-bold text-lg">${example.name}</h3>
                </div>
                <div class="p-4">
                    <p class="text-gray-700 mb-4">${example.description}</p>
                    <div class="space-y-2 text-sm">
                        <div><strong>Equation:</strong> \\( dX_t = ${example.drift}  dt + ${example.diffusion}  dW_t \\)</div>
                        <div><strong>Parameters:</strong> ${Object.entries(example.parameters).map(([k, v]) => `${k} = ${v}`).join(', ')}</div>
                    </div>
                    <button class="w-full bg-teal-600 text-white py-2 rounded mt-4 hover:bg-teal-700 transition load-example" 
                            data-drift="${example.drift}" data-diffusion="${example.diffusion}" 
                            data-params='${JSON.stringify(example.parameters)}' data-process-type="${example.process_type || 'custom'}">
                        Load Example
                    </button>
                </div>
            </div>
        `;
    }
    
    examplesContainer.innerHTML = examplesHTML;
    
    // Re-attach events to new buttons
    document.querySelectorAll('.load-example').forEach(btn => {
        btn.addEventListener('click', function() {
            const drift = this.getAttribute('data-drift');
            const diffusion = this.getAttribute('data-diffusion');
            const params = this.getAttribute('data-params');
            const processType = this.getAttribute('data-process-type') || 'custom';
            
            document.getElementById('drift').value = drift;
            document.getElementById('diffusion').value = diffusion;
            document.getElementById('problemDescription').value = params;
            document.getElementById('processType').value = processType;
            
            showSection('solver');
        });
    });
    
    // Re-render MathJax
    if (typeof MathJax !== 'undefined') {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Set active section
    showSection('solver');
    
    // Set active nav link
    document.querySelector('.nav-link[data-target="solver"]').classList.add('active-tab');
    
    // Configure process selector
    setupProcessSelector();
    
    // Load examples
    loadExamples();
    
    // Log the API URL for debugging
    console.log('API Base URL:', API_BASE_URL);
    console.log('Frontend URL:', window.location.href);
});
