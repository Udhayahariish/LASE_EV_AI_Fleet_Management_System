// --- Global Application State ---
let currentUser = null;
let currentRole = 'guest';
let globalAdminData = null;
let globalDriverData = null;
let activeTab = 'admin-overview';
let chartInstances = {};
let currentTheme = localStorage.getItem('lase_ev_theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    if (window.lucide) {
        lucide.createIcons();
    }
    checkSession();
});

function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeToggleUI();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('lase_ev_theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeToggleUI();
    if (globalAdminData) {
        if (activeTab === 'admin-analytics') renderFleetAnalyticsCharts(globalAdminData.fleet_analytics || {});
        if (activeTab === 'admin-powerbi') updatePowerBIReport();
    }
}

function updateThemeToggleUI() {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const label = document.getElementById('theme-toggle-label');
    if (currentTheme === 'dark') {
        if (sunIcon) sunIcon.style.display = 'inline-block';
        if (moonIcon) moonIcon.style.display = 'none';
        if (label) label.innerText = 'Light Mode';
    } else {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'inline-block';
        if (label) label.innerText = 'Dark Mode';
    }
    if (window.lucide) { lucide.createIcons(); }
}

// --- Helper Functions ---
function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setElHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// --- Splash Screen & Navigation Handlers ---
function enterApp() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => {
            splash.style.display = 'none';
            const navbar = document.getElementById('app-navbar');
            if (navbar) navbar.style.display = 'flex';
            if (currentUser) {
                navToDashboard();
            } else {
                navToHome();
            }
        }, 300);
    }
}

function checkSession() {
    fetch('/api/session')
        .then(res => res.json())
        .then(data => {
            if (data && data.logged_in && data.user) {
                currentUser = data.user;
                currentRole = data.user.role || 'driver';
                updateNavbarState();
                navToDashboard();
            } else {
                currentUser = null;
                currentRole = 'guest';
                updateNavbarState();
                navToHome();
            }
        })
        .catch(err => {
            console.warn('Session check notice:', err);
            currentUser = null;
            currentRole = 'guest';
            updateNavbarState();
            navToHome();
        });
}

function updateNavbarState() {
    const guestActions = document.getElementById('nav-guest-actions');
    const authActions = document.getElementById('nav-auth-actions');

    if (currentUser) {
        if (guestActions) guestActions.style.display = 'none';
        if (authActions) authActions.style.display = 'flex';
        setElText('user-email-display', currentUser.email || currentUser.name || 'User');
        setElText('user-name-display', `(${currentUser.role ? currentUser.role.toUpperCase() : 'USER'})`);
    } else {
        if (guestActions) guestActions.style.display = 'flex';
        if (authActions) authActions.style.display = 'none';
    }
}

function navToHome() {
    const dashView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');

    if (dashView) dashView.style.display = 'none';
    if (homeView) homeView.style.display = 'flex';

    const btnHome = document.getElementById('btn-nav-home');
    const btnDash = document.getElementById('btn-nav-dash');
    const heroBtn = document.getElementById('hero-action-btn');

    if (currentUser) {
        if (btnHome) btnHome.classList.add('active');
        if (btnDash) btnDash.classList.remove('active');
        if (heroBtn) heroBtn.innerHTML = '<span>Go to Dashboard</span><i data-lucide="arrow-right"></i>';
    } else {
        if (btnHome) btnHome.classList.remove('active');
        if (btnDash) btnDash.classList.remove('active');
        if (heroBtn) heroBtn.innerHTML = '<span>Get Started</span><i data-lucide="arrow-right"></i>';
    }
    if (window.lucide) { lucide.createIcons(); }
}

function navToDashboard() {
    if (!currentUser) {
        openModal('login');
        return;
    }
    const dashView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');

    if (homeView) homeView.style.display = 'none';
    if (dashView) dashView.style.display = 'block';

    const btnHome = document.getElementById('btn-nav-home');
    const btnDash = document.getElementById('btn-nav-dash');

    if (btnHome) btnHome.classList.remove('active');
    if (btnDash) btnDash.classList.add('active');

    updateNavbarState();
    loadDashboardData();
    if (window.lucide) { lucide.createIcons(); }
}

function handleHeroAction() {
    if (currentUser) {
        navToDashboard();
    } else {
        openModal('register');
    }
}

// --- Dashboard Sidebar Tab Switching ---
function switchDashboardTab(tabName) {
    activeTab = tabName;

    // Toggle active state in sidebar menu items
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const targetItem = document.getElementById(`nav-item-${tabName}`);
    if (targetItem) targetItem.classList.add('active');

    const titleMap = {
        'admin-overview': 'Fleet Overview & Highlights',
        'admin-powerbi': 'Executive Power BI Analytics Report',
        'admin-lase-analysis': 'LASE Fleet Deep Analysis & Intelligence Console',
        'admin-lase-assistant': 'LASE ASSISTANCE - EV Fleet AI Assistant',
        'admin-vehicles': 'Connected Electric Vehicles (50 Unique)',
        'admin-drivers': 'Fleet Personnel Directory (50 Drivers)',
        'admin-trips': 'Master Trips History & Telemetry',
        'admin-maintenance': 'Garage Status & Vehicle Maintenance',
        'admin-alerts': 'System Telematics & Safety Alerts',
        'admin-revenue': 'Financial Revenue Breakdown',
        'admin-analytics': 'Fleet Graphical Analytics',
        'driver-profile': 'Driver Profile & Safety Score',
        'driver-vehicle': 'Assigned Vehicle Specifications',
        'driver-predict': 'Range Prediction Dashboard',
        'driver-trips': 'My Trip Log & Performance',
        'driver-maint': 'Vehicle Garage & Maintenance Status',
        'driver-revenue': 'Earnings & Revenue Breakdown'
    };

    setElText('page-title-text', titleMap[tabName] || 'Dashboard');
    setElText('page-meta-tag', currentRole === 'admin' ? 'EV FLEET INTELLIGENCE' : 'DRIVER PORTAL');

    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => pane.style.display = 'none');

    const activePane = document.getElementById(`tab-view-${tabName}`);
    if (activePane) activePane.style.display = 'block';

    if (tabName === 'admin-analytics' && globalAdminData && globalAdminData.fleet_analytics) {
        setTimeout(() => renderFleetAnalyticsCharts(globalAdminData.fleet_analytics), 100);
    }
    if (tabName === 'admin-powerbi' && globalAdminData) {
        setTimeout(() => updatePowerBIReport(), 100);
    }
    if (tabName === 'admin-lase-analysis' && globalAdminData && globalAdminData.lase_analysis) {
        setTimeout(() => renderLaseAnalysisView(globalAdminData.lase_analysis), 100);
    }

    if (window.lucide) { lucide.createIcons(); }
}

// --- Load Dashboard Data (Admin vs Driver) ---
function loadDashboardData() {
    const name = currentUser.name || 'User';
    const initialChar = name.charAt(0).toUpperCase();

    setElText('user-avatar-initial', initialChar);
    setElText('profile-display-name', name);
    setElText('profile-display-role', currentRole.toUpperCase());
    setElText('banner-user-name', name);

    const adminSidebar = document.getElementById('admin-sidebar-menu');
    const driverSidebar = document.getElementById('driver-sidebar-menu');

    if (currentRole === 'admin') {
        if (adminSidebar) adminSidebar.style.display = 'flex';
        if (driverSidebar) driverSidebar.style.display = 'none';
        setElText('sidebar-role-title', 'EV Fleet');
        setElText('sidebar-role-subtitle', 'Admin Console');
        setElText('banner-user-desc', 'Real-time status for 50 electric vehicles across 5 EV companies.');
        
        switchDashboardTab('admin-overview');
        fetchAdminData();
    } else {
        if (adminSidebar) adminSidebar.style.display = 'none';
        if (driverSidebar) driverSidebar.style.display = 'flex';
        setElText('sidebar-role-title', 'Driver Portal');
        setElText('sidebar-role-subtitle', 'My EV Telematics');
        setElText('banner-user-desc', 'View your assigned EV specs, trips, and earnings.');

        switchDashboardTab('driver-profile');
        fetchDriverData();
    }
}

// --- Fetch Admin Data ---
function fetchAdminData() {
    fetch('/api/admin-data')
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) return;
            globalAdminData = data;
            const st = data.stats || {};
            const hl = st.highlights || {};

            // 5 Top KPI Cards (Non-overlapping exact counts summing to Total 50 EVs)
            setElText('kpi-total-evs', st.total_vehicles || 50);
            setElText('kpi-running-evs', st.running_count || 0);
            setElText('kpi-charging-evs', st.charging_count || 0);
            setElText('kpi-garage-evs', st.maintenance_count || 0);
            setElText('kpi-parked-evs', st.parked_count || 0);

            // Ground-truth Highlights
            if (hl.max_revenue_vehicle) {
                setElText('hl-max-rev-id', hl.max_revenue_vehicle.vehicle_id);
                setElText('hl-max-rev-model', `${hl.max_revenue_vehicle.manufacturer} ${hl.max_revenue_vehicle.model}`);
                setElText('hl-max-rev-val', `₹${hl.max_revenue_vehicle.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
                setElText('hl-max-rev-driver', `Driver: ${hl.max_revenue_vehicle.driver_name} (Gross Fare)`);
            }

            if (hl.min_revenue_vehicle) {
                setElText('hl-min-rev-id', hl.min_revenue_vehicle.vehicle_id);
                setElText('hl-min-rev-model', `${hl.min_revenue_vehicle.manufacturer} ${hl.min_revenue_vehicle.model}`);
                setElText('hl-min-rev-val', `₹${hl.min_revenue_vehicle.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
                setElText('hl-min-rev-driver', `Driver: ${hl.min_revenue_vehicle.driver_name} (Gross Fare)`);
            }

            if (hl.max_maint_vehicle) {
                setElText('hl-max-maint-id', hl.max_maint_vehicle.vehicle_id);
                setElText('hl-max-maint-model', `${hl.max_maint_vehicle.manufacturer} ${hl.max_maint_vehicle.model}`);
                setElText('hl-max-maint-val', `₹${hl.max_maint_vehicle.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
            }

            if (hl.min_maint_vehicle) {
                setElText('hl-min-maint-id', hl.min_maint_vehicle.vehicle_id);
                setElText('hl-min-maint-model', `${hl.min_maint_vehicle.manufacturer} ${hl.min_maint_vehicle.model}`);
                setElText('hl-min-maint-val', `₹${hl.min_maint_vehicle.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
            }

            if (hl.top_driver) {
                setElText('hl-top-driver-name', hl.top_driver.driver_name);
                setElText('hl-top-driver-id', `Driver ID: ${hl.top_driver.driver_id}`);
                setElText('hl-top-driver-val', `₹${hl.top_driver.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
                setElText('hl-top-driver-rating', `Net Payout | Rating: ${hl.top_driver.rating} ★ (Score: ${hl.top_driver.score})`);
            }

            // Trips KPI Cards
            setElText('kpi-trips-total', (st.total_trips || 10000).toLocaleString());
            setElText('kpi-trips-completed', (st.completed_trips || 10000).toLocaleString());
            setElText('kpi-trips-cancelled', (st.cancelled_trips || 0).toLocaleString());
            setElText('kpi-trips-distance', `${(st.total_distance || 768416.8).toLocaleString()} km`);

            // Revenue Cards
            setElText('rev-gross-val', `₹${(st.total_revenue || 13557611.86).toLocaleString()}`);
            setElText('rev-net-val', `₹${(st.net_revenue || 10755909.49).toLocaleString()}`);
            setElText('rev-profit-val', `₹${(st.total_profit || 4747146.29).toLocaleString()}`);
            setElText('rev-maint-val', `₹${(st.total_maintenance_cost || 499471.96).toLocaleString()}`);

            // Render Tables
            renderAdminOverviewTable(data.vehicles || []);
            renderAdminVehiclesTable(data.vehicles || []);
            renderAdminDriversTable(data.drivers || []);
            renderAdminTripsTable(data.trips || []);
            renderAdminMaintenanceTable(data.maintenance || []);
            renderAdminAlertsTable(data.alerts || []);

            if (data.fleet_analytics) {
                renderAdminCompanyRevenueTable(data.fleet_analytics.company_revenue || {});
            }

            if (data.lase_analysis) {
                renderLaseAnalysisView(data.lase_analysis);
            }
        })
        .catch(err => console.warn("Admin data fetch error:", err));
}

// --- Fetch Driver Data ---
function fetchDriverData() {
    fetch('/api/driver-data')
        .then(res => res.json())
        .then(data => {
            let sm = (data && data.success && data.summary) ? data.summary : {};
            let trips = (data && data.success && data.trips) ? data.trips : [];
            let stations = (data && data.success && data.nearby_stations) ? data.nearby_stations : [];

            if (!sm.driver_name) {
                sm = {
                    driver_id: (currentUser && currentUser.driver_id) || 'D001',
                    driver_name: (currentUser && currentUser.name) || 'Aarav Sharma',
                    mail: (currentUser && currentUser.email) || 'driver1@gmail.com',
                    driver_experience_years: 16,
                    driving_behavior: 'Normal',
                    avg_rating: 4.4,
                    avg_score: 87.4,
                    overspeed_total: 208,
                    harsh_braking_total: 438,
                    rapid_accel_total: 417,
                    vehicle_id: 'EV001',
                    registration_number: 'TN01EV00001',
                    manufacturer: 'Tata',
                    model: 'Tiago EV',
                    vehicle_type: 'Hatchback',
                    battery_capacity_kwh: 24.0,
                    claimed_range_km: 285,
                    motor_power_kw: 55,
                    vehicle_weight_gvwr_kg: 1580,
                    total_torque_nm: 114,
                    battery_temperature_c: 41.3,
                    acceleration_0_100_s: 11.2,
                    cargo_volume_l: 240,
                    charging_status: 'Not Charging',
                    current_speed: 96.1,
                    vehicle_in_garage: 'No',
                    garage_reason: 'None (Vehicle Operational)',
                    last_maintenance_date: '2026-08-01',
                    next_maintenance_date: '2026-09-15',
                    daily_revenue: 2850,
                    monthly_revenue: 85500,
                    gross_revenue: 310400,
                    net_revenue: 248320,
                    maintenance_cost: 10500,
                    maintenance_type: 'Routine Inspection',
                    maintenance_status: 'Completed'
                };
            }

            globalDriverData = { success: true, summary: sm, trips: trips, nearby_stations: stations };

            renderDriverProfile(sm);
            renderDriverVehicle(sm);
            renderDriverTrips(trips);
            renderDriverMaintenance(sm);
            renderDriverRevenue(sm);
        })
        .catch(err => {
            console.warn("Driver data fetch error:", err);
            const fallbackSm = {
                driver_id: (currentUser && currentUser.driver_id) || 'D001',
                driver_name: (currentUser && currentUser.name) || 'Aarav Sharma',
                mail: (currentUser && currentUser.email) || 'driver1@gmail.com',
                driver_experience_years: 16,
                driving_behavior: 'Normal',
                avg_rating: 4.4,
                avg_score: 87.4,
                overspeed_total: 208,
                harsh_braking_total: 438,
                rapid_accel_total: 417,
                vehicle_id: 'EV001',
                registration_number: 'TN01EV00001',
                manufacturer: 'Tata',
                model: 'Tiago EV',
                vehicle_type: 'Hatchback',
                battery_capacity_kwh: 24.0,
                claimed_range_km: 285,
                motor_power_kw: 55,
                vehicle_weight_gvwr_kg: 1580,
                total_torque_nm: 114,
                battery_temperature_c: 41.3,
                acceleration_0_100_s: 11.2,
                cargo_volume_l: 240,
                charging_status: 'Not Charging',
                current_speed: 96.1,
                vehicle_in_garage: 'No',
                garage_reason: 'None (Vehicle Operational)',
                last_maintenance_date: '2026-08-01',
                next_maintenance_date: '2026-09-15',
                daily_revenue: 2850,
                monthly_revenue: 85500,
                gross_revenue: 310400,
                net_revenue: 248320,
                maintenance_cost: 10500,
                maintenance_type: 'Routine Inspection',
                maintenance_status: 'Completed'
            };
            globalDriverData = { success: true, summary: fallbackSm, trips: [] };
            renderDriverProfile(fallbackSm);
            renderDriverVehicle(fallbackSm);
            renderDriverTrips([]);
            renderDriverMaintenance(fallbackSm);
            renderDriverRevenue(fallbackSm);
        });
}

// --- Render Admin Tables ---
function renderAdminOverviewTable(vehicles) {
    const tbody = document.getElementById('admin-overview-table-body');
    if (!tbody) return;
    if (!vehicles.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No vehicles found.</td></tr>';
        return;
    }
    tbody.innerHTML = vehicles.map(v => {
        let statusBadgeClass = 'status-ok';
        if (v.live_status === 'In Garage') statusBadgeClass = 'status-warn';
        else if (v.live_status === 'Charging' || v.live_status === 'Parked') statusBadgeClass = 'status-info';

        return `
        <tr class="clickable-row" onclick="openVehicleDetailModal('${v.vehicle_id}')" title="Click to view vehicle specs & telematics">
            <td><strong>${v.vehicle_id}</strong></td>
            <td>${v.manufacturer} ${v.model}</td>
            <td><code>${v.registration_number}</code></td>
            <td>${v.driver_name}</td>
            <td><span class="status-badge status-info">${v.charging_status}</span></td>
            <td><span class="status-badge ${statusBadgeClass}">${v.live_status || 'Active'}</span></td>
            <td><strong>₹${(v.gross_revenue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
        </tr>
    `}).join('');
}

function renderAdminVehiclesTable(vehicles) {
    const tbody = document.getElementById('admin-vehicles-table-body');
    if (!tbody) return;
    if (!vehicles.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No vehicles found.</td></tr>';
        return;
    }
    tbody.innerHTML = vehicles.map(v => `
        <tr class="clickable-row" onclick="openVehicleDetailModal('${v.vehicle_id}')" title="Click to view vehicle specs & telematics">
            <td><strong>${v.vehicle_id}</strong></td>
            <td>${v.manufacturer}</td>
            <td>${v.model}</td>
            <td>${v.vehicle_type}</td>
            <td><code>${v.registration_number}</code></td>
            <td>${v.driver_name}</td>
            <td>${v.battery_capacity_kwh} kWh</td>
            <td><span class="status-badge status-info">${v.charging_status}</span></td>
            <td><span class="status-badge ${v.vehicle_in_garage === 'Yes' ? 'status-warn' : 'status-ok'}">${v.live_status || (v.vehicle_in_garage === 'Yes' ? 'In Garage' : 'Active')}</span></td>
            <td><strong>₹${(v.gross_revenue || 0).toLocaleString()}</strong></td>
            <td><button class="btn-sm-action" onclick="event.stopPropagation(); openVehicleDetailModal('${v.vehicle_id}')">View Specs</button></td>
        </tr>
    `).join('');
}

function filterVehiclesByCompany(company) {
    if (!globalAdminData || !globalAdminData.vehicles) return;
    if (company === 'ALL') {
        renderAdminVehiclesTable(globalAdminData.vehicles);
    } else {
        const filtered = globalAdminData.vehicles.filter(v => (v.manufacturer || '').toLowerCase() === company.toLowerCase());
        renderAdminVehiclesTable(filtered);
    }
}

function renderAdminDriversTable(drivers) {
    const tbody = document.getElementById('admin-drivers-table-body');
    if (!tbody) return;
    if (!drivers.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No drivers found.</td></tr>';
        return;
    }
    tbody.innerHTML = drivers.map(d => `
        <tr class="clickable-row" onclick="openDriverDetailModal('${d.driver_id}')" title="Click to view driver performance & observations">
            <td><strong>${d.driver_id}</strong></td>
            <td>${d.driver_name}</td>
            <td>${d.mail}</td>
            <td>${d.experience} Yrs</td>
            <td><span class="status-badge status-ok">${d.driving_behavior || 'Safe'}</span></td>
            <td><span class="status-badge status-ok">${d.rating} / 5</span></td>
            <td>${d.score} / 100</td>
            <td><strong>${d.assigned_vehicle}</strong></td>
            <td><strong class="text-emerald">₹${(d.net_revenue || 0).toLocaleString()}</strong></td>
            <td>Overspeed: <strong>${d.overspeed_count}</strong> | Harsh: <strong>${d.harsh_braking_count}</strong></td>
        </tr>
    `).join('');
}

function renderAdminTripsTable(trips) {
    const tbody = document.getElementById('admin-trips-table-body');
    if (!tbody) return;
    if (!trips.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No trips found.</td></tr>';
        return;
    }
    tbody.innerHTML = trips.slice(0, 100).map(t => `
        <tr>
            <td><strong>${t.trip_id}</strong></td>
            <td>${t.trip_date}</td>
            <td>${t.vehicle_id || 'EV00001'}</td>
            <td>${t.driver_name}</td>
            <td>${t.trip_distance_km} km</td>
            <td>${t.avg_speed_kmph} km/h</td>
            <td><span class="status-badge status-ok">${t.trip_status}</span></td>
            <td>₹${(t.gross_revenue_inr || 0).toLocaleString()}</td>
        </tr>
    `).join('');
}



function renderAdminMaintenanceTable(maintenanceList) {
    const tbody = document.getElementById('admin-maintenance-table-body');
    if (!tbody) return;
    tbody.innerHTML = maintenanceList.map(m => `
        <tr>
            <td><strong>${m.vehicle_id}</strong></td>
            <td>${m.driver_name}</td>
            <td><code>${m.registration_number}</code></td>
            <td><span class="status-badge ${m.vehicle_in_garage === 'Yes' ? 'status-warn' : 'status-ok'}">${m.vehicle_in_garage === 'Yes' ? 'Yes (Garage)' : 'No (Active)'}</span></td>
            <td>${m.maintenance_type}</td>
            <td>${m.maintenance_date}</td>
            <td>${m.last_maintenance_date}</td>
            <td>${m.next_maintenance_date}</td>
            <td><strong>₹${(m.maintenance_cost || 0).toLocaleString()}</strong></td>
            <td><span class="status-badge status-ok">${m.maintenance_status}</span></td>
            <td>${m.maintenance_frequency}</td>
        </tr>
    `).join('');
}

function renderAdminAlertsTable(alerts) {
    const tbody = document.getElementById('admin-alerts-table-body');
    if (!tbody) return;
    tbody.innerHTML = alerts.map(a => `
        <tr>
            <td><strong>${a.id}</strong></td>
            <td><strong>${a.type}</strong></td>
            <td>${a.vehicle_id}</td>
            <td>${a.driver_name}</td>
            <td>${a.created_at}</td>
            <td><span class="status-badge ${a.severity === 'High' ? 'status-warn' : 'status-info'}">${a.severity}</span></td>
            <td><span class="status-badge status-ok">${a.status}</span></td>
        </tr>
    `).join('');
}

function renderAdminCompanyRevenueTable(companyMap) {
    const tbody = document.getElementById('admin-revenue-company-body');
    if (!tbody) return;
    const entries = Object.entries(companyMap);
    tbody.innerHTML = entries.map(([comp, amount]) => `
        <tr>
            <td><strong>${comp}</strong></td>
            <td>10 EVs</td>
            <td class="text-emerald"><strong>₹${amount.toLocaleString()}</strong></td>
            <td>₹${(amount / 10).toLocaleString()}</td>
        </tr>
    `).join('');
}

// --- Render Driver Views ---
function renderDriverProfile(sm) {
    setElText('driver-prof-avatar', (sm.driver_name || 'D').charAt(0).toUpperCase());
    setElText('driver-prof-name', sm.driver_name || 'Driver');
    setElText('driver-prof-id', `Driver ID: ${sm.driver_id || 'DR00001'}`);
    setElText('driver-prof-email', sm.mail || 'driver@example.com');
    setElText('driver-prof-exp', `${sm.driver_experience_years || 5} Years`);
    setElText('driver-prof-behavior', sm.driving_behavior || 'Safe');
    setElText('driver-prof-rating', `${sm.avg_rating || 4.8} / 5.0 ★`);
    setElText('driver-prof-score', `${sm.avg_score || 88.5} / 100`);
    setElText('driver-prof-assigned-veh', `${sm.vehicle_id || 'EV00001'} (${sm.registration_number || 'TN01EV00001'})`);

    setElText('driver-prof-overspeed', sm.overspeed_total || 0);
    setElText('driver-prof-harsh', sm.harsh_braking_total || 0);
    setElText('driver-prof-rapid', sm.rapid_accel_total || 0);
}

function renderDriverVehicle(sm) {
    setElText('drv-v-id', sm.vehicle_id || 'EV00001');
    setElText('drv-v-mfr', sm.manufacturer || 'Tata');
    setElText('drv-v-model', sm.model || 'Nexon EV');
    setElText('drv-v-type', sm.vehicle_type || 'SUV');
    setElText('drv-v-reg', sm.registration_number || 'TN01EV00001');
    setElText('drv-v-chg-status', sm.charging_status || 'Not Charging');
    setElText('drv-v-speed', `${sm.current_speed || 0} km/h`);
    setElText('drv-v-garage', sm.vehicle_in_garage === 'Yes' ? 'Yes (In Garage)' : 'No (Operational)');
    setElText('drv-v-garage-reason', sm.garage_reason || 'None');
    setElText('drv-v-last-maint', sm.last_maintenance_date || '2026-08-01');
    setElText('drv-v-next-maint', sm.next_maintenance_date || '2026-09-15');

    // Auto-select vehicle in ML predictor dropdown
    const vehSelect = document.getElementById('predict-vehicle-select');
    if (vehSelect && sm.manufacturer && sm.model) {
        const targetVal = `${sm.manufacturer}|${sm.model}`;
        for (let opt of vehSelect.options) {
            if (opt.value.toLowerCase() === targetVal.toLowerCase()) {
                vehSelect.value = opt.value;
                break;
            }
        }
    }

    // Populate auto-loaded vehicle specs for ML Range Predictor
    setElText('pred-spec-model', `${sm.model || 'Nexon EV'} (${sm.manufacturer || 'Tata'})`);
    setElText('pred-spec-capacity', `${sm.battery_capacity_kwh || 45.0} kWh`);
    setElText('pred-spec-claimed', `${sm.claimed_range_km || 489} km`);
    setElText('pred-spec-power', `${sm.motor_power_kw || 106} kW`);
    setElText('pred-spec-weight', `${sm.vehicle_weight_gvwr_kg || 1800} kg`);
    setElText('pred-spec-torque', `${sm.total_torque_nm || 215} Nm`);
    setElText('pred-spec-temp', `${sm.battery_temperature_c || 32.5} °C`);
    setElText('pred-spec-accel', `${sm.acceleration_0_100_s || 9.0} s`);
    setElText('pred-spec-cargo', `${sm.cargo_volume_l || 350} L`);

    // Populate standalone ML Range Predictor badge
    setElText('standalone-assigned-veh-badge', `${sm.manufacturer || 'Tata'} ${sm.model || 'Nexon EV'}`);
}

const VEHICLE_DATASET_LOOKUP = {
    "Tiago EV": { mfr: "Tata", capacity: 24.0, claimed: 285.0, power: 55, weight: 1580, torque: 114, temp: 28.0, accel: 11.2, cargo: 240 },
    "Punch EV": { mfr: "Tata", capacity: 35.0, claimed: 350.0, power: 90, weight: 1650, torque: 190, temp: 29.5, accel: 9.5, cargo: 366 },
    "Nexon EV": { mfr: "Tata", capacity: 40.5, claimed: 489.0, power: 106, weight: 1800, torque: 215, temp: 32.5, accel: 8.9, cargo: 350 },
    "XUV400 EV": { mfr: "Mahindra", capacity: 39.4, claimed: 456.0, power: 110, weight: 1720, torque: 310, temp: 30.0, accel: 8.3, cargo: 378 },
    "BE 6e": { mfr: "Mahindra", capacity: 59.0, claimed: 683.0, power: 170, weight: 2100, torque: 380, temp: 27.5, accel: 6.7, cargo: 450 },
    "XEV 9e": { mfr: "Mahindra", capacity: 79.0, claimed: 656.0, power: 210, weight: 2250, torque: 400, temp: 28.0, accel: 6.8, cargo: 500 },
    "Comet EV": { mfr: "MG", capacity: 17.3, claimed: 230.0, power: 31, weight: 1150, torque: 110, temp: 31.0, accel: 13.5, cargo: 180 },
    "Windsor EV": { mfr: "MG", capacity: 38.0, claimed: 449.0, power: 100, weight: 1680, torque: 200, temp: 29.0, accel: 8.8, cargo: 380 },
    "ZS EV": { mfr: "MG", capacity: 50.3, claimed: 461.0, power: 130, weight: 1850, torque: 280, temp: 30.5, accel: 8.5, cargo: 470 },
    "Kona Electric": { mfr: "Hyundai", capacity: 39.2, claimed: 452.0, power: 100, weight: 1680, torque: 395, temp: 29.0, accel: 9.7, cargo: 332 },
    "Creta EV": { mfr: "Hyundai", capacity: 45.0, claimed: 510.0, power: 120, weight: 1780, torque: 255, temp: 28.5, accel: 8.4, cargo: 400 },
    "Ioniq 5": { mfr: "Hyundai", capacity: 72.6, claimed: 631.0, power: 160, weight: 2150, torque: 350, temp: 27.0, accel: 5.2, cargo: 527 },
    "e Vitara": { mfr: "Maruti Suzuki", capacity: 49.0, claimed: 543.0, power: 106, weight: 1750, torque: 189, temp: 28.5, accel: 8.9, cargo: 370 },
    "eWX": { mfr: "Maruti Suzuki", capacity: 20.0, claimed: 240.0, power: 40, weight: 1200, torque: 115, temp: 30.0, accel: 12.0, cargo: 210 },
    "Fronx EV": { mfr: "Maruti Suzuki", capacity: 32.0, claimed: 337.5, power: 80, weight: 1450, torque: 160, temp: 29.0, accel: 10.1, cargo: 308 }
};

function onPredictVehicleChange() {
    const vehSelect = document.getElementById('predict-vehicle-select');
    if (!vehSelect) return;
    const vehVal = vehSelect.value || 'Tata|Tiago EV';
    const [mfr, model] = vehVal.split('|');
    setElText('pred-spec-model', `${model} (${mfr})`);
    
    const specs = VEHICLE_DATASET_LOOKUP[model] || {};
    if (specs.capacity) setElText('pred-spec-capacity', `${specs.capacity} kWh`);
    if (specs.claimed) setElText('pred-spec-claimed', `${specs.claimed} km`);
    if (specs.power) setElText('pred-spec-power', `${specs.power} kW`);
    if (specs.weight) setElText('pred-spec-weight', `${specs.weight} kg`);
    if (specs.torque) setElText('pred-spec-torque', `${specs.torque} Nm`);
    if (specs.temp) setElText('pred-spec-temp', `${specs.temp} °C`);
    if (specs.accel) setElText('pred-spec-accel', `${specs.accel} s`);
    if (specs.cargo) setElText('pred-spec-cargo', `${specs.cargo} L`);
}

function runEVRangePrediction() {
    const btn = document.getElementById('btn-predict-range');
    const btnText = document.getElementById('predict-btn-text');
    const resultPanel = document.getElementById('prediction-result-panel');
    const outputKmEl = document.getElementById('predict-output-km');

    const vehVal = document.getElementById('predict-vehicle-select') ? document.getElementById('predict-vehicle-select').value : 'Tata|Tiago EV';
    const parts = vehVal.split('|');
    const mfr = parts[0] || 'Tata';
    const model = parts[1] || 'Tiago EV';

    const batteryPct = parseFloat(document.getElementById('predict-battery-num').value || 75);
    const roadType = document.getElementById('predict-road-type').value || 'City';

    const payload = {
        manufacturer: mfr,
        model: model,
        battery_percentage: batteryPct,
        road_type: roadType
    };

    if (btnText) btnText.innerText = 'Calculating ML Range...';
    if (btn) btn.disabled = true;

    fetch('/api/predict-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (btnText) btnText.innerText = 'Predict Range';
        if (btn) btn.disabled = false;

        if (data && data.success) {
            const predKm = data.predicted_range_km || 0;
            if (resultPanel) resultPanel.style.display = 'block';

            // Animate Range Result Counter
            let startVal = 0;
            const duration = 800;
            const startTime = performance.now();
            
            function animateCount(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentKm = (startVal + progress * (predKm - startVal)).toFixed(1);
                if (outputKmEl) outputKmEl.innerHTML = `${currentKm} <span style="font-size: 1.5rem; font-weight: 700;">km</span>`;
                if (progress < 1) {
                    requestAnimationFrame(animateCount);
                }
            }
            requestAnimationFrame(animateCount);

            setElText('res-badge-model', `Model: ${data.model || model}`);
            setElText('res-badge-battery', `Battery: ${data.battery_percentage}%`);
            setElText('res-badge-road', `Road: ${data.road_type} Driving`);
            setElText('pred-spec-claimed', `${data.claimed_range_km || 'N/A'} km`);

            if (typeof showToast === 'function') {
                showToast(`ML Prediction Ready: ${predKm} km for ${data.model}`);
            }
        } else {
            if (typeof showToast === 'function') showToast('Prediction error. Please try again.');
        }
    })
    .catch(err => {
        if (btnText) btnText.innerText = 'Predict Range';
        if (btn) btn.disabled = false;
        console.error('Prediction fetch error:', err);
        if (typeof showToast === 'function') showToast('Error calling prediction service.');
    });
}

function runStandaloneEVRangePrediction() {
    const btn = document.getElementById('btn-standalone-predict-range');
    const btnText = document.getElementById('standalone-predict-btn-text');
    const resultPanel = document.getElementById('standalone-prediction-result-panel');
    const outputKmEl = document.getElementById('standalone-predict-output-km');

    // Automatically retrieve the assigned vehicle specs from globalDriverData or default summary
    const sm = (globalDriverData && globalDriverData.summary) ? globalDriverData.summary : {};
    const mfr = sm.manufacturer || 'Tata';
    const model = sm.model || 'Tiago EV';

    const batteryPct = parseFloat(document.getElementById('standalone-predict-battery-num').value || 75);
    const roadType = document.getElementById('standalone-predict-road-type').value || 'City';

    const payload = {
        manufacturer: mfr,
        model: model,
        battery_percentage: batteryPct,
        road_type: roadType
    };

    if (btnText) btnText.innerText = 'Calculating ML Range...';
    if (btn) btn.disabled = true;

    fetch('/api/predict-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (btnText) btnText.innerText = 'Predict Range';
        if (btn) btn.disabled = false;

        if (data && data.success) {
            const predKm = data.predicted_range_km || 0;
            if (resultPanel) resultPanel.style.display = 'block';

            // Animate Range Result Counter
            let startVal = 0;
            const duration = 800;
            const startTime = performance.now();
            
            function animateCount(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentKm = (startVal + progress * (predKm - startVal)).toFixed(1);
                if (outputKmEl) outputKmEl.innerHTML = `${currentKm} <span style="font-size: 1.5rem; font-weight: 700;">km</span>`;
                if (progress < 1) {
                    requestAnimationFrame(animateCount);
                }
            }
            requestAnimationFrame(animateCount);

            setElText('standalone-res-badge-model', `Model: ${data.model || model}`);
            setElText('standalone-res-badge-battery', `Battery: ${data.battery_percentage}%`);
            setElText('standalone-res-badge-road', `Road: ${data.road_type} Driving`);

            if (typeof showToast === 'function') {
                showToast(`ML Range Prediction: ${predKm} km for ${data.model}`);
            }
        } else {
            if (typeof showToast === 'function') showToast('Prediction error. Please try again.');
        }
    })
    .catch(err => {
        if (btnText) btnText.innerText = 'Predict Range';
        if (btn) btn.disabled = false;
        console.error('Standalone prediction fetch error:', err);
        if (typeof showToast === 'function') showToast('Error calling prediction service.');
    });
}

function renderDriverTrips(trips) {
    const tbody = document.getElementById('driver-trips-table-body');
    if (!tbody) return;
    if (!trips.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No trips recorded for this driver.</td></tr>';
        return;
    }
    tbody.innerHTML = trips.slice(0, 50).map(t => `
        <tr>
            <td><strong>${t.trip_id}</strong></td>
            <td>${t.trip_date}</td>
            <td>${t.trip_duration_minutes} mins</td>
            <td>${t.trip_distance_km} km</td>
            <td>${t.speed_kmph || t.avg_speed_kmph || 0} km/h</td>
            <td><span class="status-badge status-ok">${t.trip_status}</span></td>
            <td class="text-emerald"><strong>₹${(t.trip_profit_inr || 0).toLocaleString()}</strong></td>
        </tr>
    `).join('');
}



function renderDriverMaintenance(sm) {
    setElText('drv-m-id', sm.vehicle_id || 'EV00001');
    setElText('drv-m-garage', sm.vehicle_in_garage === 'Yes' ? 'Yes (Garage)' : 'No (Operational)');
    setElText('drv-m-type', sm.maintenance_type || 'Routine Inspection');
    setElText('drv-m-status', sm.maintenance_status || 'Completed');
    setElText('drv-m-cost', `₹${(sm.maintenance_cost || 0).toLocaleString()}`);
    setElText('drv-m-last', sm.last_maintenance_date || '2026-08-01');
    setElText('drv-m-next', sm.next_maintenance_date || '2026-09-15');
}

function renderDriverRevenue(sm) {
    setElText('drv-rev-daily', `₹${(sm.daily_revenue || 0).toLocaleString()}`);
    setElText('drv-rev-monthly', `₹${(sm.monthly_revenue || 0).toLocaleString()}`);
    setElText('drv-rev-gross', `₹${(sm.gross_revenue || 0).toLocaleString()}`);
    setElText('drv-rev-net', `₹${(sm.net_revenue || 0).toLocaleString()}`);
}

// --- Render Chart.js Fleet Analytics Charts (Styled for Dark Slate Theme) ---
function renderFleetAnalyticsCharts(analytics) {
    if (!window.Chart) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const defaultScaleOptions = {
        grid: { color: gridColor },
        ticks: { color: textColor }
    };

    const getOrResetChart = (canvasId, type, data, options) => {
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        chartInstances[canvasId] = new Chart(ctx, { type, data, options });
    };

    // 1. Company Revenue Chart
    const compData = analytics.company_revenue || {};
    getOrResetChart('companyRevenueChartCanvas', 'bar', {
        labels: Object.keys(compData),
        datasets: [{
            label: 'Gross Revenue (₹)',
            data: Object.values(compData),
            backgroundColor: ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#3b82f6'],
            borderRadius: 8
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: defaultScaleOptions, y: defaultScaleOptions }
    });

    // 2. Top Performing Drivers
    const topD = analytics.top_drivers || [];
    getOrResetChart('topDriversChartCanvas', 'bar', {
        labels: topD.map(d => d.driver_name),
        datasets: [{
            label: 'Net Revenue (₹)',
            data: topD.map(d => d.net_revenue_inr),
            backgroundColor: '#10b981',
            borderRadius: 8
        }]
    }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: defaultScaleOptions, y: defaultScaleOptions }
    });

    // 3. Behavior Distribution Chart
    const beh = analytics.behavior_counts || {};
    getOrResetChart('behaviorChartCanvas', 'doughnut', {
        labels: Object.keys(beh),
        datasets: [{
            data: Object.values(beh),
            backgroundColor: ['#10b981', '#38bdf8', '#fbbf24', '#f87171']
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#f8fafc' } } }
    });

    // 4. Top EV Models Performance
    const modelData = analytics.ev_model_revenue || {};
    getOrResetChart('evModelChartCanvas', 'bar', {
        labels: Object.keys(modelData),
        datasets: [{
            label: 'Model Gross Revenue (₹)',
            data: Object.values(modelData),
            backgroundColor: '#c084fc',
            borderRadius: 8
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: defaultScaleOptions, y: defaultScaleOptions }
    });

    // 5. Harsh Braking Chart
    const harsh = analytics.harsh_braking || [];
    getOrResetChart('harshBrakingChartCanvas', 'bar', {
        labels: harsh.map(h => h.driver_name),
        datasets: [{
            label: 'Harsh Braking Count',
            data: harsh.map(h => h.harsh_braking_count),
            backgroundColor: '#f87171',
            borderRadius: 8
        }]
    }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: defaultScaleOptions, y: defaultScaleOptions }
    });

    // 6. Overspeed Chart
    const overspeed = analytics.overspeed || [];
    getOrResetChart('overspeedChartCanvas', 'bar', {
        labels: overspeed.map(o => o.driver_name),
        datasets: [{
            label: 'Overspeed Event Count',
            data: overspeed.map(o => o.overspeed_count),
            backgroundColor: '#fbbf24',
            borderRadius: 8
        }]
    }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: defaultScaleOptions, y: defaultScaleOptions }
    });
}

// --- Detail Modal Viewer ---
function openVehicleDetailModal(vehicleId) {
    if (!globalAdminData || !globalAdminData.vehicles) return;
    const v = globalAdminData.vehicles.find(veh => veh.vehicle_id === vehicleId);
    if (!v) return;

    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
        <div class="detail-modal-header">
            <h2>Vehicle Specification & Telemetry Details</h2>
            <p class="text-cyan" style="font-weight: 700; margin-top: 4px;">ID: ${v.vehicle_id} | ${v.manufacturer} ${v.model}</p>
        </div>
        <div class="specs-grid">
            <div class="spec-item"><span class="label">Registration Number</span><strong>${v.registration_number}</strong></div>
            <div class="spec-item"><span class="label">Assigned Driver</span><strong>${v.driver_name} (ID: ${v.driver_id})</strong></div>
            <div class="spec-item"><span class="label">Vehicle Type</span><strong>${v.vehicle_type}</strong></div>
            <div class="spec-item"><span class="label">Battery Capacity</span><strong>${v.battery_capacity_kwh} kWh</strong></div>
            <div class="spec-item"><span class="label">Charging Status</span><strong>${v.charging_status}</strong></div>
            <div class="spec-item"><span class="label">Live Active Status</span><strong>${v.live_status || 'On Road'}</strong></div>
            <div class="spec-item"><span class="label">Current Speed</span><strong>${v.speed_kmph} km/h</strong></div>
            <div class="spec-item"><span class="label">Gross Revenue</span><strong class="text-emerald">₹${v.gross_revenue.toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Maintenance Cost</span><strong class="text-rose">₹${v.maintenance_cost.toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Charging Cost</span><strong>₹${v.charging_cost.toLocaleString()}</strong></div>
            <div class="spec-item"><span class="label">Total Odometer</span><strong>${(v.odometer_km || 12000).toLocaleString()} km</strong></div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.style.display = 'none';
}

// --- Executive Analytics Reporting Engine ---
let pbiChartInstances = {};

function updatePowerBIReport() {
    if (!globalAdminData || !globalAdminData.vehicles) return;
    const mfrFilter = (document.getElementById('pbi-slicer-mfr') || {}).value || 'ALL';
    const statusFilter = (document.getElementById('pbi-slicer-status') || {}).value || 'ALL';
    const behaviorFilter = (document.getElementById('pbi-slicer-behavior') || {}).value || 'ALL';

    let filteredVehicles = globalAdminData.vehicles;

    if (mfrFilter !== 'ALL') {
        filteredVehicles = filteredVehicles.filter(v => (v.manufacturer || '').toLowerCase() === mfrFilter.toLowerCase());
    }

    if (statusFilter !== 'ALL') {
        filteredVehicles = filteredVehicles.filter(v => {
            const isGarage = v.vehicle_in_garage === 'Yes';
            const isCharging = v.charging_status === 'Charging';
            const isRunning = (v.speed_kmph || 0) > 0;
            const sf = statusFilter.toLowerCase();
            if (sf.includes('garage')) return isGarage;
            if (sf.includes('charging')) return isCharging;
            if (sf.includes('running')) return isRunning && !isGarage && !isCharging;
            if (sf.includes('parked')) return !isRunning && !isGarage && !isCharging;
            return true;
        });
    }

    if (behaviorFilter !== 'ALL' && globalAdminData.drivers) {
        const matchingDriverIds = new Set(
            globalAdminData.drivers
                .filter(d => (d.driving_behavior || '').toLowerCase() === behaviorFilter.toLowerCase())
                .map(d => d.driver_id)
        );
        filteredVehicles = filteredVehicles.filter(v => matchingDriverIds.has(v.driver_id));
    }

    // Filtered Metrics Calculation
    const totalRev = filteredVehicles.reduce((sum, v) => sum + (v.gross_revenue || 0), 0);
    const totalNet = filteredVehicles.reduce((sum, v) => sum + (v.net_revenue || 0), 0);
    const totalMaint = filteredVehicles.reduce((sum, v) => sum + (v.maintenance_cost || 0), 0);
    const totalProfit = totalNet - totalMaint;
    const totalDistance = filteredVehicles.reduce((sum, v) => sum + (v.total_distance || 0), 0);

    // Active Uptime Calculation
    const activeVehs = filteredVehicles.filter(v => v.vehicle_in_garage !== 'Yes');
    const uptimePct = filteredVehicles.length > 0 ? ((activeVehs.length / filteredVehicles.length) * 100).toFixed(1) : '100.0';

    // Avg Driver Safety Score
    let avgSafety = '88.5';
    if (globalAdminData.drivers && filteredVehicles.length > 0) {
        const activeDriverIds = new Set(filteredVehicles.map(v => v.driver_id));
        const matchedDrivers = globalAdminData.drivers.filter(d => activeDriverIds.has(d.driver_id));
        if (matchedDrivers.length > 0) {
            const sumScore = matchedDrivers.reduce((s, d) => s + (d.score || 88.5), 0);
            avgSafety = (sumScore / matchedDrivers.length).toFixed(1);
        }
    }

    setElText('pbi-kpi-revenue', totalRev >= 1000000 ? `₹${(totalRev / 1000000).toFixed(2)}M` : `₹${Math.round(totalRev).toLocaleString()}`);
    setElText('pbi-kpi-profit', totalProfit >= 1000000 ? `₹${(totalProfit / 1000000).toFixed(2)}M` : `₹${Math.round(totalProfit).toLocaleString()}`);
    setElText('pbi-kpi-distance', `${Math.round(totalDistance).toLocaleString()} km`);
    setElText('pbi-kpi-efficiency', `${uptimePct}%`);
    setElText('pbi-kpi-safety', `${avgSafety}`);

    renderPowerBICharts(filteredVehicles, globalAdminData.fleet_analytics || {});
    renderPowerBIMatrixTable(filteredVehicles);
}

function resetPowerBIFilters() {
    const mfr = document.getElementById('pbi-slicer-mfr');
    const status = document.getElementById('pbi-slicer-status');
    const behavior = document.getElementById('pbi-slicer-behavior');
    if (mfr) mfr.value = 'ALL';
    if (status) status.value = 'ALL';
    if (behavior) behavior.value = 'ALL';
    updatePowerBIReport();
    if (typeof showToast === 'function') showToast('Analytics slicers reset to default.');
}

function exportPowerBIReport() {
    if (!globalAdminData || !globalAdminData.vehicles) {
        if (typeof showToast === 'function') showToast('No analytics data available to export.');
        return;
    }

    const mfrFilter = (document.getElementById('pbi-slicer-mfr') || {}).value || 'ALL';
    const statusFilter = (document.getElementById('pbi-slicer-status') || {}).value || 'ALL';
    const behaviorFilter = (document.getElementById('pbi-slicer-behavior') || {}).value || 'ALL';

    let filtered = globalAdminData.vehicles;
    if (mfrFilter !== 'ALL') {
        filtered = filtered.filter(v => (v.manufacturer || '').toLowerCase() === mfrFilter.toLowerCase());
    }
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(v => {
            const isGarage = v.vehicle_in_garage === 'Yes';
            const isCharging = v.charging_status === 'Charging';
            const isRunning = (v.speed_kmph || 0) > 0;
            const sf = statusFilter.toLowerCase();
            if (sf.includes('garage')) return isGarage;
            if (sf.includes('charging')) return isCharging;
            if (sf.includes('running')) return isRunning && !isGarage && !isCharging;
            if (sf.includes('parked')) return !isRunning && !isGarage && !isCharging;
            return true;
        });
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "LASE EV - Executive Analytics Report Summary\n";
    csvContent += `Generated At,${new Date().toLocaleString()}\n`;
    csvContent += `Manufacturer Filter,${mfrFilter}\n`;
    csvContent += `Status Filter,${statusFilter}\n`;
    csvContent += `Driver Behavior Filter,${behaviorFilter}\n`;
    csvContent += `Total Vehicles Count,${filtered.length}\n\n`;

    csvContent += "Vehicle ID,Manufacturer,Model,Registration,Driver ID,Driver Name,Live Status,Odometer (km),Gross Revenue (INR),Net Revenue (INR),Maintenance Cost (INR)\n";

    filtered.forEach(v => {
        const row = [
            `"${v.vehicle_id}"`,
            `"${v.manufacturer}"`,
            `"${v.model}"`,
            `"${v.registration_number}"`,
            `"${v.driver_id}"`,
            `"${v.driver_name}"`,
            `"${v.live_status || 'Operational'}"`,
            v.odometer_km || 0,
            v.gross_revenue || 0,
            v.net_revenue || 0,
            v.maintenance_cost || 0
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EV_Fleet_Executive_Analytics_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') showToast('Executive Analytics Report exported successfully (CSV download)!');
}

function getOrResetPBIChart(canvasId, type, data, options) {
    if (!window.Chart) return;
    if (pbiChartInstances[canvasId]) {
        pbiChartInstances[canvasId].destroy();
    }
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    pbiChartInstances[canvasId] = new Chart(ctx, { type, data, options });
}

function renderPowerBICharts(vehicles, analytics) {
    if (!window.Chart) return;

    const isDarkPBI = document.documentElement.getAttribute('data-theme') === 'dark';
    const darkGrid = { grid: { color: isDarkPBI ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }, ticks: { color: isDarkPBI ? '#94a3b8' : '#475569' } };

    // 1. Quarterly Financial Trend (Area Chart)
    const qTrends = analytics.quarterly_trends || {
        labels: ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026 (Est.)"],
        revenue: [2850000, 3420000, 3980000, 4307611],
        profit: [1520000, 1850000, 2120000, 2350400]
    };
    getOrResetPBIChart('pbiChartQuarterlyCanvas', 'line', {
        labels: qTrends.labels,
        datasets: [
            {
                label: 'Gross Revenue (₹)',
                data: qTrends.revenue,
                borderColor: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            },
            {
                label: 'Net Profit (₹)',
                data: qTrends.profit,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }
        ]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: darkGrid, y: darkGrid }
    });

    // 2. OEM Financial Matrix (Grouped Bar Chart)
    const oemMap = {};
    vehicles.forEach(v => {
        const m = v.manufacturer || 'Tata';
        if (!oemMap[m]) oemMap[m] = { rev: 0, maint: 0 };
        oemMap[m].rev += v.gross_revenue || 0;
        oemMap[m].maint += v.maintenance_cost || 0;
    });
    getOrResetPBIChart('pbiChartMfrCompCanvas', 'bar', {
        labels: Object.keys(oemMap),
        datasets: [
            {
                label: 'Gross Revenue (₹)',
                data: Object.values(oemMap).map(o => o.rev),
                backgroundColor: '#0284c7',
                borderRadius: 6
            },
            {
                label: 'Maintenance Expense (₹)',
                data: Object.values(oemMap).map(o => o.maint),
                backgroundColor: '#f43f5e',
                borderRadius: 6
            }
        ]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: darkGrid, y: darkGrid }
    });

    // 3. Operational Status Breakdown (Doughnut Chart)
    const statusCounts = { Running: 0, Charging: 0, Garage: 0, Parked: 0 };
    vehicles.forEach(v => {
        if (v.vehicle_in_garage === 'Yes') statusCounts.Garage++;
        else if (v.charging_status === 'Charging') statusCounts.Charging++;
        else if ((v.speed_kmph || 0) > 0) statusCounts.Running++;
        else statusCounts.Parked++;
    });

    getOrResetPBIChart('pbiChartStatusCanvas', 'doughnut', {
        labels: Object.keys(statusCounts),
        datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#64748b']
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: isDarkPBI ? '#f8fafc' : '#1e293b' } } }
    });

    // 4. Top Driver Leaderboard
    const topD = (analytics.top_drivers || []).slice(0, 6);
    getOrResetPBIChart('pbiChartTopDriversCanvas', 'bar', {
        labels: topD.map(d => d.driver_name),
        datasets: [{
            label: 'Net Earnings (₹)',
            data: topD.map(d => d.net_revenue_inr),
            backgroundColor: '#8b5cf6',
            borderRadius: 6
        }]
    }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: darkGrid, y: darkGrid }
    });

    // 5. Model Efficiency Index (kWh/100km)
    const effMap = analytics.model_efficiency || {
        "Nexon EV": 14.2, "Punch EV": 13.5, "Tiago EV": 12.8, "ZS EV": 15.6,
        "IONIQ 5": 16.8, "XUV400 EV": 15.0, "e Vitara": 14.5
    };
    getOrResetPBIChart('pbiChartEfficiencyCanvas', 'bar', {
        labels: Object.keys(effMap),
        datasets: [{
            label: 'Energy Consumed (kWh/100km)',
            data: Object.values(effMap),
            backgroundColor: '#06b6d4',
            borderRadius: 6
        }]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: darkGrid, y: darkGrid }
    });

    // 6. Driver Safety Violations
    const harsh = (analytics.harsh_braking || []).slice(0, 6);
    const overspeed = (analytics.overspeed || []).slice(0, 6);
    getOrResetPBIChart('pbiChartSafetyCanvas', 'bar', {
        labels: harsh.map(h => h.driver_name),
        datasets: [
            {
                label: 'Harsh Braking Events',
                data: harsh.map(h => h.harsh_braking_count),
                backgroundColor: '#f43f5e',
                borderRadius: 6
            },
            {
                label: 'Overspeed Events',
                data: overspeed.map(o => o.overspeed_count),
                backgroundColor: '#f59e0b',
                borderRadius: 6
            }
        ]
    }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: darkGrid, y: darkGrid }
    });
}

function renderPowerBIMatrixTable(vehicles) {
    const tbody = document.getElementById('pbi-matrix-table-body');
    if (!tbody) return;

    // Group vehicles by manufacturer
    const mfrMap = {};
    vehicles.forEach(v => {
        const m = v.manufacturer || 'Tata';
        if (!mfrMap[m]) {
            mfrMap[m] = { count: 0, gross: 0, maint: 0, dist: 0 };
        }
        mfrMap[m].count++;
        mfrMap[m].gross += v.gross_revenue || 0;
        mfrMap[m].maint += v.maintenance_cost || 0;
        mfrMap[m].dist += v.total_distance || 0;
    });

    const entries = Object.entries(mfrMap);
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No Power BI records match filter criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = entries.map(([mfr, data]) => {
        const netProfit = data.gross * 0.55;
        const avgEnergy = (13.5 + Math.random() * 2.5).toFixed(1);
        return `
            <tr>
                <td><strong>${mfr}</strong></td>
                <td><span class="status-badge status-info">${data.count} EVs</span></td>
                <td><strong class="text-emerald">₹${data.gross.toLocaleString()}</strong></td>
                <td><strong class="text-rose">₹${data.maint.toLocaleString()}</strong></td>
                <td><strong class="text-cyan">₹${netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></td>
                <td>${data.dist.toLocaleString()} km</td>
                <td>${avgEnergy} kWh/100km</td>
                <td><span class="status-badge status-ok">A+ Rated</span></td>
            </tr>
        `;
    }).join('');
}

// --- Live Table Filtering Helper ---
function filterTable(inputId, tbodyId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

// --- Auth Modal Handlers ---
function openModal(type) {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex';
    switchModalTab(type);
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
    resetForms();
}

function closeModalOnBackdrop(e) {
    if (e.target.id === 'auth-modal') {
        closeModal();
    }
}

function switchModalTab(type) {
    const signupForm = document.getElementById('modal-signup');
    const loginForm = document.getElementById('modal-login');
    const regRole = document.getElementById('reg-role');

    if (type === 'register' || type === 'signup') {
        if (signupForm) signupForm.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        updateModalBanner(regRole ? regRole.value : 'driver');
    } else {
        if (signupForm) signupForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        updateModalBanner('driver');
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye"></i>';
    }
    if (window.lucide) { lucide.createIcons(); }
}

function updateModalBanner(role) {
    const bannerTitle = document.getElementById('modal-banner-title');
    const bannerSub = document.getElementById('modal-banner-sub');
    const bannerDesc = document.getElementById('modal-banner-desc');

    if (role === 'admin') {
        if (bannerTitle) bannerTitle.innerText = "LASE EV";
        if (bannerSub) bannerSub.innerText = "Admin Console";
        if (bannerDesc) bannerDesc.innerText = "Complete Fleet Control, Powered by Live Intelligence.";
    } else {
        if (bannerTitle) bannerTitle.innerText = "LASE EV";
        if (bannerSub) bannerSub.innerText = "Driver Portal";
        if (bannerDesc) bannerDesc.innerText = "Seamless Drive. Real-Time Range. Intelligent Energy on the Go.";
    }
}

function resetForms() {
    const signup = document.getElementById('modal-signup');
    const login = document.getElementById('modal-login');
    if (signup) signup.reset();
    if (login) login.reset();
    setElText('signup-error-box', '');
    setElText('login-error-box', '');
    const sBox = document.getElementById('signup-error-box');
    const lBox = document.getElementById('login-error-box');
    if (sBox) sBox.style.display = 'none';
    if (lBox) lBox.style.display = 'none';
}

function showToast(msg) {
    const toast = document.getElementById('bottom-page-toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// --- Auth Submission Handlers ---
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errBox = document.getElementById('login-error-box');

    if (errBox) errBox.style.display = 'none';

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            currentUser = data.user;
            currentRole = data.user.role || 'driver';
            closeModal();
            updateNavbarState();
            showToast(`Welcome back, ${currentUser.name}!`);
            navToDashboard();
        } else {
            if (errBox) {
                errBox.innerText = (data && data.message) ? data.message : 'Login failed.';
                errBox.style.display = 'block';
            }
        }
    })
    .catch(err => {
        if (errBox) {
            errBox.innerText = 'Server error during login.';
            errBox.style.display = 'block';
        }
    });
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;
    const errBox = document.getElementById('signup-error-box');

    if (errBox) errBox.style.display = 'none';

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            currentUser = data.user;
            currentRole = data.user.role || 'driver';
            closeModal();
            updateNavbarState();
            showToast(`Account created! Welcome, ${currentUser.name}!`);
            navToDashboard();
        } else {
            if (errBox) {
                errBox.innerText = (data && data.message) ? data.message : 'Registration failed.';
                errBox.style.display = 'block';
            }
        }
    })
    .catch(err => {
        if (errBox) {
            errBox.innerText = 'Server error during sign up.';
            errBox.style.display = 'block';
        }
    });
}

function handleLogout() {
    fetch('/api/logout', { method: 'POST' })
        .then(() => {
            currentUser = null;
            currentRole = 'guest';
            updateNavbarState();
            showToast('Logged out successfully.');
            navToHome();
        })
        .catch(err => {
            currentUser = null;
            currentRole = 'guest';
            updateNavbarState();
            showToast('Logged out.');
            navToHome();
        });
}

// --- Universal Table Column Click-to-Sort Handler ---
// Clicking any <th> sorts the table rows in Ascending order.
// Clicking the same <th> again restores the table to its normal/original state.
document.addEventListener('click', function (e) {
    const th = e.target.closest('th');
    if (!th) return;
    const table = th.closest('table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.children).filter(r => r.tagName === 'TR');
    if (rows.length <= 1) return;

    // Skip sorting placeholder or error rows
    if (rows.length === 1 && rows[0].cells.length === 1 && (rows[0].innerText.includes('Loading') || rows[0].innerText.includes('No '))) return;

    const thList = Array.from(th.parentNode.children);
    const colIndex = thList.indexOf(th);
    if (colIndex === -1) return;

    // Save snapshot of original unsorted row order if not saved or if table rows changed dynamically
    const currentRowsKey = rows.map(r => r.innerText.slice(0, 40)).join('||');
    if (!table._originalRows || table._rowsSnapshotKey !== currentRowsKey) {
        table._originalRows = rows.map(r => r.cloneNode(true));
        table._rowsSnapshotKey = currentRowsKey;
        table._activeSortCol = -1;
        table._sortState = 0; // 0 = Normal, 1 = Ascending
    }

    // Reset sort state if clicking a different column
    if (table._activeSortCol !== colIndex) {
        table._activeSortCol = colIndex;
        table._sortState = 0;
    }

    // Toggle state: 0 (Normal) -> 1 (Ascending) -> 0 (Normal)
    if (table._sortState === 0) {
        table._sortState = 1;

        // Perform Ascending Sort
        const sortedRows = rows.slice().sort((rowA, rowB) => {
            const cellA = rowA.cells[colIndex] ? rowA.cells[colIndex].innerText.trim() : '';
            const cellB = rowB.cells[colIndex] ? rowB.cells[colIndex].innerText.trim() : '';

            // Clean numerical/currency values (strip ₹, commas, %, kWh, km, etc.)
            const cleanA = cellA.replace(/[^0-9.-]/g, '');
            const cleanB = cellB.replace(/[^0-9.-]/g, '');

            const numA = parseFloat(cleanA);
            const numB = parseFloat(cleanB);

            // Compare numerically if both cell texts contain valid numbers
            if (!isNaN(numA) && !isNaN(numB) && cleanA.length > 0 && cleanB.length > 0 && /\d/.test(cellA) && /\d/.test(cellB)) {
                return numA - numB;
            }

            // Otherwise compare alphabetically / naturally
            return cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Update DOM
        tbody.innerHTML = '';
        sortedRows.forEach(r => tbody.appendChild(r));
    } else {
        // Restore Normal State
        table._sortState = 0;
        table._activeSortCol = -1;

        tbody.innerHTML = '';
        table._originalRows.forEach(r => tbody.appendChild(r.cloneNode(true)));
    }
});

// ==================== LASE ANALYSIS VIEW RENDERER ====================
function renderLaseAnalysisView(lase) {
    if (!lase) return;

    // 1. Executive Fleet KPI Cards
    const vst = lase.vehicle_status || {};
    setElText('lase-v-uptime-pct', `${vst.uptime_percent || 96.0}% Fleet Uptime`);
    setElText('lase-v-status-counts', `${vst.running || 0} Active | ${vst.charging || 0} Charging | ${vst.garage || 0} Garage`);

    // Driver Safety Summary KPI
    const dss = lase.driver_safety_summary || {};
    setElText('lase-top-violator-name', `${dss.safe_count || 0} Safe / ${dss.high_risk_count || 0} High Risk`);
    setElText('lase-top-violator-sub', `${dss.total_drivers || 50} Total Fleet Drivers Registered`);

    // Max Charging Time Car KPI
    const maxChg = lase.max_charge_time_car || {};
    setElText('lase-max-charge-model', `${maxChg.manufacturer || ''} ${maxChg.model || ''}`);
    setElText('lase-max-charge-sub', `Battery: ${maxChg.battery_capacity_kwh || 0} kWh | Std Charge: ~${maxChg.std_charge_time_min || 0} min`);

    // Fleet Maintenance Summary KPI
    const topBrand = (lase.brand_maintenance || [])[0] || {};
    const totalMaintSum = (lase.brand_maintenance || []).reduce((acc, curr) => acc + (curr.maintenance_cost || 0), 0);
    setElText('lase-top-brand-maint', `₹${totalMaintSum.toLocaleString('en-IN')}`);
    setElText('lase-top-brand-maint-sub', `Top Brand Cost: ${topBrand.brand || 'Tata Motors'} (₹${(topBrand.maintenance_cost || 0).toLocaleString()})`);

    // 2. Driver Safety & Risk Analysis Table
    const driverViolTbody = document.getElementById('lase-drivers-violations-body');
    if (driverViolTbody) {
        const driversList = lase.driver_violations_leaderboard || [];
        driverViolTbody.innerHTML = driversList.map((d) => {
            let riskBadgeClass = 'status-ok';
            if (d.risk_level === 'High Risk') riskBadgeClass = 'status-rose';
            else if (d.risk_level === 'Moderate Risk') riskBadgeClass = 'status-warn';
            else if (d.risk_level === 'Normal Driver') riskBadgeClass = 'status-info';
            else riskBadgeClass = 'status-ok';

            let behaviorTagClass = 'tag-purple';
            if (d.driving_behavior === 'Safe') behaviorTagClass = 'tag-emerald';
            else if (d.driving_behavior === 'Normal') behaviorTagClass = 'tag-purple';
            else if (d.driving_behavior === 'Moderate') behaviorTagClass = 'tag-amber';
            else if (d.driving_behavior === 'Aggressive') behaviorTagClass = 'tag-rose';

            return `
            <tr class="clickable-row" onclick="openHistoryModal('driver', '${d.driver_id}')" title="Click to view complete driver & vehicle history">
                <td><code>${d.driver_id}</code></td>
                <td><strong>${d.driver_name}</strong></td>
                <td>${d.assigned_vehicle_model || d.assigned_vehicle} (${d.assigned_registration || ''})</td>
                <td><span class="badge-tag ${behaviorTagClass}">${d.driving_behavior || 'Normal'}</span></td>
                <td><strong>${d.score}</strong> / 100</td>
                <td><span class="status-badge status-ok">${d.rating} ★</span></td>
                <td><span class="badge-tag tag-amber">${d.overspeed_count}</span></td>
                <td><span class="badge-tag tag-rose">${d.harsh_braking_count}</span></td>
                <td><span class="badge-tag tag-purple">${d.rapid_accel_count}</span></td>
                <td><strong class="text-rose">${d.total_violations}</strong></td>
                <td><span class="status-badge ${riskBadgeClass}">${d.risk_level || 'Safe Driver'}</span></td>
            </tr>
            `;
        }).join('');
    }

    // 3. Revenue Based on Driver Table
    const driverRevTbody = document.getElementById('lase-drivers-revenue-body');
    if (driverRevTbody) {
        const revList = lase.revenue_by_driver || [];
        driverRevTbody.innerHTML = revList.map(d => `
            <tr class="clickable-row" onclick="openHistoryModal('driver', '${d.driver_id}')" title="Click to view full driver earnings & history">
                <td><code>${d.driver_id}</code></td>
                <td><strong>${d.driver_name}</strong></td>
                <td>${d.trips_count || 200} Trips</td>
                <td>${(d.total_distance || 0).toLocaleString()} km</td>
                <td><strong>₹${(d.gross_revenue || 0).toLocaleString()}</strong></td>
                <td><strong class="text-emerald">₹${(d.net_revenue || 0).toLocaleString()}</strong></td>
                <td>₹${(d.driver_salary || 0).toLocaleString()}</td>
                <td>₹${(d.commission || 0).toLocaleString()}</td>
                <td><strong class="text-purple">₹${(d.trip_profit || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge status-ok">${d.profit_margin_pct || 0}%</span></td>
            </tr>
        `).join('');
    }

    // 4. Charging Expense & Battery Charging Analysis Table
    const chgMaxTitle = document.getElementById('chg-max-car-title');
    const chgMaxDesc = document.getElementById('chg-max-car-desc');
    const chgFleetTotal = document.getElementById('chg-fleet-total-val');

    if (maxChg.model) {
        if (chgMaxTitle) chgMaxTitle.textContent = `${maxChg.manufacturer} ${maxChg.model} (${maxChg.battery_capacity_kwh} kWh Battery)`;
        if (chgMaxDesc) chgMaxDesc.textContent = `Standard Full Charge: ~${maxChg.std_charge_time_min} min (${(maxChg.std_charge_time_min / 60).toFixed(1)} hrs) | Fast Charge (150 kW): ~${maxChg.fast_charge_time_min} min`;
    }
    const totalChgCost = (lase.car_charging_analysis || []).reduce((acc, curr) => acc + (curr.total_charging_cost || 0), 0);
    if (chgFleetTotal) chgFleetTotal.textContent = `₹${totalChgCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const chgTbody = document.getElementById('lase-charging-analysis-body');
    if (chgTbody) {
        const chgList = lase.car_charging_analysis || [];
        chgTbody.innerHTML = chgList.map(c => {
            const chgTimeHrs = c.charging_time_hours || (Math.round(((c.charging_time_minutes || 1450) / 60.0) * 10) / 10);
            return `
            <tr class="clickable-row" onclick="openHistoryModal('model', '${c.model}')" title="Click to view vehicle model history">
                <td><strong>${c.model}</strong></td>
                <td>${c.manufacturer}</td>
                <td>${c.battery_capacity_kwh} kWh</td>
                <td>${(c.total_energy_added_kwh || 0).toLocaleString()} kWh</td>
                <td><strong class="text-cyan">₹${(c.total_charging_cost || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge status-info">${c.charging_time_minutes || 1450} mins (~${chgTimeHrs} hrs)</span></td>
                <td><span class="status-badge status-ok">~${c.fast_charge_time_min} min</span></td>
                <td><span class="status-badge status-warn">~${c.std_charge_time_min} min (${(c.std_charge_time_min / 60).toFixed(1)} hrs)</span></td>
                <td><code>${c.charge_speed_rating}</code></td>
                <td><button class="btn-sm-action" onclick="event.stopPropagation(); openHistoryModal('model', '${c.model}')">📜 History</button></td>
            </tr>
            `;
        }).join('');
    }

    // 5. Maintenance Expenses: Brand-wise & Car-wise
    const brandMaintTbody = document.getElementById('lase-brand-maint-body');
    if (brandMaintTbody) {
        const brandList = lase.brand_maintenance || [];
        brandMaintTbody.innerHTML = brandList.map(b => `
            <tr>
                <td><strong>${b.brand}</strong></td>
                <td>${b.total_vehicles} EVs</td>
                <td>₹${(b.gross_revenue || 0).toLocaleString()}</td>
                <td><strong class="text-purple">₹${(b.maintenance_cost || 0).toLocaleString()}</strong></td>
                <td><span class="badge-tag tag-purple" style="font-size: 0.78rem;">${b.maintenance_types_summary || 'Routine & Diagnostics'}</span></td>
                <td><strong class="text-cyan">₹${(b.charging_cost || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge status-info">${b.charging_time_hours || 0} hrs</span></td>
                <td><span class="status-badge status-ok">${b.maint_pct_of_rev}%</span></td>
            </tr>
        `).join('');
    }

    const carMaintTbody = document.getElementById('lase-car-maint-body');
    if (carMaintTbody) {
        const carList = lase.car_maintenance || [];
        carMaintTbody.innerHTML = carList.map(c => `
            <tr class="clickable-row" onclick="openHistoryModal('vehicle', '${c.vehicle_id}')" title="Click to open complete vehicle history">
                <td><code>${c.vehicle_id}</code></td>
                <td><strong>${c.manufacturer} ${c.model}</strong></td>
                <td><code>${c.registration_number}</code></td>
                <td><span class="badge-tag tag-emerald">${c.maintenance_type || 'Routine Service'}</span></td>
                <td><strong class="text-rose">₹${(c.maintenance_cost || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge status-info">${c.charging_time_minutes || 1450} min (~${c.charging_time_hours || 24.2} hrs)</span></td>
                <td><strong class="text-cyan">₹${(c.charging_cost || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge ${c.vehicle_in_garage === 'Yes' ? 'status-warn' : 'status-ok'}">${c.live_status}</span></td>
                <td><button class="btn-sm-action glow-btn" onclick="event.stopPropagation(); openHistoryModal('vehicle', '${c.vehicle_id}')">📜 View History</button></td>
            </tr>
        `).join('');
    }

    // 6. Top 5 Car Models Table
    const topModelsTbody = document.getElementById('lase-top-models-body');
    if (topModelsTbody) {
        const modelsList = lase.top_5_car_models || [];
        topModelsTbody.innerHTML = modelsList.map((m, index) => `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td><strong>${m.model}</strong></td>
                <td>${m.manufacturer}</td>
                <td>₹${(m.gross_revenue || 0).toLocaleString()}</td>
                <td><strong class="text-emerald">₹${(m.trip_profit || 0).toLocaleString()}</strong></td>
                <td>${m.efficiency_kwh_100km} kWh/100km</td>
                <td><span class="status-badge status-ok">${m.profit_margin_pct}%</span></td>
                <td><strong class="text-gold" style="font-size: 1.05rem;">${m.performance_score} / 100</strong></td>
            </tr>
        `).join('');
    }

    // 7. Trip Revenue Component Breakdown Cards
    const tr = lase.trip_revenue_analytics || {};
    setElText('fare-base-val', `₹${(tr.base_fare_total || 0).toLocaleString()}`);
    setElText('fare-dist-val', `₹${(tr.distance_fare_total || 0).toLocaleString()}`);
    setElText('fare-time-val', `₹${(tr.time_fare_total || 0).toLocaleString()}`);
    setElText('fare-surge-val', `₹${(tr.surge_total || 0).toLocaleString()}`);
    setElText('fare-tax-val', `₹${(tr.tax_total || 0).toLocaleString()}`);
    setElText('fare-disc-val', `-₹${(tr.discount_total || 0).toLocaleString()}`);
    setElText('fare-gross-val', `₹${(tr.gross_revenue_total || 0).toLocaleString()}`);
    setElText('fare-net-val', `₹${(tr.net_revenue_total || 0).toLocaleString()}`);
    setElText('fare-prof-val', `₹${(tr.trip_profit_total || 0).toLocaleString()} (${tr.avg_profit_margin_pct || 0}% Margin)`);

    // 8. Populate Dashboard Day-Wise Date Filter Select Dropdown
    populateLaseDashboardDateFilter();
}

function populateLaseDashboardDateFilter() {
    const selectEl = document.getElementById('lase-dashboard-date-filter');
    if (!selectEl) return;
    if (selectEl.options.length > 1) return;

    let html = `<option value="ALL">📅 All Operating Dates (Aug 01 - Aug 30, 2026)</option>`;
    for (let day = 1; day <= 30; day++) {
        const dateStr = `2026-08-${day < 10 ? '0' + day : day}`;
        html += `<option value="${dateStr}">📅 Date: ${dateStr}</option>`;
    }
    selectEl.innerHTML = html;
}

function onLaseDashboardDateFilterChange(selectedDate) {
    if (!globalAdminData || !globalAdminData.lase_analysis) return;
    const lase = globalAdminData.lase_analysis;

    const carMaintTbody = document.getElementById('lase-car-maint-body');
    if (carMaintTbody) {
        const carList = lase.car_maintenance || [];
        const filteredCars = selectedDate === 'ALL' ? carList : carList.map(c => {
            const vObj = (globalAdminData.vehicles || []).find(v => v.vehicle_id === c.vehicle_id);
            if (!vObj) return c;
            const dayChg = (vObj.charging_history || []).filter(ch => ch.date === selectedDate);
            const dayCost = dayChg.reduce((a, ch) => a + ch.charging_cost_inr, 0);
            const dayMaint = (vObj.maintenance_history || []).filter(m => m.service_date === selectedDate).reduce((a, m) => a + m.maintenance_cost_inr, 0);
            const dayTime = dayChg.reduce((a, ch) => a + ch.charging_time_minutes, 0);
            return {
                ...c,
                maintenance_cost: selectedDate === 'ALL' ? c.maintenance_cost : dayMaint,
                charging_cost: selectedDate === 'ALL' ? c.charging_cost : dayCost,
                charging_time_minutes: selectedDate === 'ALL' ? c.charging_time_minutes : dayTime,
                charging_time_hours: selectedDate === 'ALL' ? c.charging_time_hours : (Math.round((dayTime / 60.0) * 10) / 10)
            };
        });

        carMaintTbody.innerHTML = filteredCars.map(c => `
            <tr class="clickable-row" onclick="openHistoryModal('vehicle', '${c.vehicle_id}')" title="Click to open complete vehicle history">
                <td><code>${c.vehicle_id}</code></td>
                <td><strong>${c.manufacturer} ${c.model}</strong></td>
                <td><code>${c.registration_number}</code></td>
                <td><span class="badge-tag tag-emerald">${c.maintenance_type || 'Routine Service'}</span></td>
                <td><strong class="text-rose">₹${(c.maintenance_cost || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><span class="status-badge status-info">${c.charging_time_minutes || 0} min (~${c.charging_time_hours || 0} hrs)</span></td>
                <td><strong class="text-cyan">₹${(c.charging_cost || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><span class="status-badge ${c.vehicle_in_garage === 'Yes' ? 'status-warn' : 'status-ok'}">${c.live_status}</span></td>
                <td><button class="btn-sm-action glow-btn" onclick="event.stopPropagation(); openHistoryModal('vehicle', '${c.vehicle_id}')">📜 View History</button></td>
            </tr>
        `).join('');
    }
}

// ==================== COMPREHENSIVE MULTI-TAB HISTORY MODAL ENGINE ====================
let currentHistoryTarget = null;
let activeHistoryTab = 'charging';

function openHistoryModal(type, targetId) {
    if (!globalAdminData) return;

    let vehicleObj = null;
    let driverObj = null;

    if (type === 'vehicle') {
        vehicleObj = (globalAdminData.vehicles || []).find(v => v.vehicle_id === targetId);
        if (vehicleObj) {
            driverObj = (globalAdminData.drivers || []).find(d => d.driver_id === vehicleObj.driver_id);
        }
    } else if (type === 'driver') {
        driverObj = (globalAdminData.drivers || []).find(d => d.driver_id === targetId);
        if (driverObj) {
            vehicleObj = (globalAdminData.vehicles || []).find(v => v.vehicle_id === driverObj.assigned_vehicle);
        }
    } else if (type === 'model') {
        vehicleObj = (globalAdminData.vehicles || []).find(v => v.model.toLowerCase() === targetId.toLowerCase());
        if (vehicleObj) {
            driverObj = (globalAdminData.drivers || []).find(d => d.driver_id === vehicleObj.driver_id);
        }
    }

    if (!vehicleObj && globalAdminData.vehicles && globalAdminData.vehicles.length > 0) {
        vehicleObj = globalAdminData.vehicles[0];
    }
    if (!driverObj && globalAdminData.drivers && globalAdminData.drivers.length > 0) {
        driverObj = globalAdminData.drivers[0];
    }

    if (!vehicleObj) return;

    currentHistoryTarget = { vehicle: vehicleObj, driver: driverObj };

    // 1. Populate History Modal Header Banner with explicit element IDs for dynamic math calculation
    const headerEl = document.getElementById('history-modal-header');
    if (headerEl) {
        headerEl.innerHTML = `
            <div class="history-modal-title-row">
                <div class="user-avatar-lg">${(driverObj ? driverObj.driver_name : vehicleObj.driver_name).charAt(0).toUpperCase()}</div>
                <div>
                    <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                        ${driverObj ? driverObj.driver_name : vehicleObj.driver_name} 
                        <span style="font-size: 1rem; color: var(--brand-primary); font-weight: 600;">(Driver ID: ${driverObj ? driverObj.driver_id : vehicleObj.driver_id})</span>
                    </h2>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 4px 0 0 0;">
                        Assigned EV: <strong>${vehicleObj.manufacturer} ${vehicleObj.model}</strong> | Reg: <code>${vehicleObj.registration_number}</code> | Type: ${vehicleObj.vehicle_type}
                    </p>
                </div>
            </div>

            <div class="history-summary-pills-row margin-top-md">
                <div class="h-pill"><span class="h-lbl">Gross Fare Revenue</span><strong class="text-emerald" id="h-sum-gross">₹${(vehicleObj.gross_revenue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                <div class="h-pill"><span class="h-lbl">Total Charging Cost</span><strong class="text-cyan" id="h-sum-chg-cost">₹${(vehicleObj.charging_cost || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                <div class="h-pill"><span class="h-lbl">Total Charging Time</span><strong class="text-blue" id="h-sum-chg-time">${vehicleObj.charging_time_minutes || 1450} min (~${vehicleObj.charging_time_hours || 24.2} hrs)</strong></div>
                <div class="h-pill"><span class="h-lbl">Total Maintenance Cost</span><strong class="text-rose" id="h-sum-maint-cost">₹${(vehicleObj.maintenance_cost || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                <div class="h-pill"><span class="h-lbl">Net Trip Profit</span><strong class="text-purple" id="h-sum-profit">₹${(vehicleObj.trip_profit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
            </div>
        `;
    }

    // 2. Populate Date Filter Select Dropdown
    populateHistoryDateSelect(vehicleObj);

    // 3. Render initial views with 'ALL' date selected
    onHistoryDateFilterChange('ALL');

    // 4. Display Modal & Switch to Charging tab
    switchHistoryTab('charging');
    const modal = document.getElementById('history-modal');
    if (modal) modal.style.display = 'flex';
    if (window.lucide) { lucide.createIcons(); }
}

function populateHistoryDateSelect(v) {
    const selectEl = document.getElementById('history-date-select');
    if (!selectEl) return;

    const dateSet = new Set();
    (v.charging_history || []).forEach(c => { if (c.date) dateSet.add(c.date); });
    (v.trip_history || []).forEach(t => { if (t.trip_date) dateSet.add(t.trip_date); });
    (v.maintenance_history || []).forEach(m => { if (m.service_date) dateSet.add(m.service_date); });

    const sortedDates = Array.from(dateSet).sort();

    let html = `<option value="ALL">📅 All Operating Dates (${sortedDates.length} Days)</option>`;
    sortedDates.forEach(d => {
        html += `<option value="${d}">📅 Date: ${d}</option>`;
    });

    selectEl.innerHTML = html;
    selectEl.value = 'ALL';
}

function onHistoryDateFilterChange(selectedDate) {
    if (!currentHistoryTarget || !currentHistoryTarget.vehicle) return;
    const v = currentHistoryTarget.vehicle;
    const d = currentHistoryTarget.driver;

    const tripsAll = v.trip_history || [];
    const chgAll = v.charging_history || [];
    const maintAll = v.maintenance_history || [];

    const tripsFiltered = selectedDate === 'ALL' ? tripsAll : tripsAll.filter(t => t.trip_date === selectedDate);
    const chgFiltered = selectedDate === 'ALL' ? chgAll : chgAll.filter(c => c.date === selectedDate);
    const maintFiltered = selectedDate === 'ALL' ? maintAll : maintAll.filter(m => m.service_date === selectedDate);

    // 100% PERFECT MATHEMATICAL RECONCILIATION
    const grossRevSum = tripsFiltered.reduce((a, t) => a + (t.gross_revenue_inr || 0), 0);
    const chgCostSum = chgFiltered.reduce((a, c) => a + (c.charging_cost_inr || 0), 0);
    const chgTimeSum = chgFiltered.reduce((a, c) => a + (c.charging_time_minutes || 0), 0);
    const maintCostSum = maintFiltered.reduce((a, m) => a + (m.maintenance_cost_inr || 0), 0);
    const profitSum = tripsFiltered.reduce((a, t) => a + (t.trip_profit_inr || 0), 0);

    // Update Header Summary Pills dynamically
    setElText('h-sum-gross', `₹${grossRevSum.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElText('h-sum-chg-cost', `₹${chgCostSum.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElText('h-sum-chg-time', `${chgTimeSum} min (~${(chgTimeSum/60.0).toFixed(1)} hrs)`);
    setElText('h-sum-maint-cost', `₹${maintCostSum.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElText('h-sum-profit', `₹${profitSum.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

    // Render Tab Views with Filtered Records
    renderChargingHistoryTabFiltered(chgFiltered);
    renderTripHistoryTabFiltered(tripsFiltered);
    renderMaintenanceHistoryTabFiltered(maintFiltered);
    renderSummaryHistoryTab(v, d);

    filterActiveHistoryTable();
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.style.display = 'none';
}

function openDriverSelfHistoryModal() {
    if (!currentUser) return;
    const driverId = currentUser.driver_id || 'DR00001';
    openHistoryModal('driver', driverId);
}

function switchHistoryTab(tabName) {
    activeHistoryTab = tabName;

    const btnList = ['charging', 'trips', 'maint', 'summary'];
    btnList.forEach(t => {
        const btn = document.getElementById(`htab-btn-${t}`);
        const pane = document.getElementById(`history-pane-${t}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
    });

    const searchInput = document.getElementById('history-modal-search');
    if (searchInput) searchInput.value = '';
    filterActiveHistoryTable();
}

function filterActiveHistoryTable() {
    const searchInput = document.getElementById('history-modal-search');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();

    const activePane = document.getElementById(`history-pane-${activeHistoryTab}`);
    if (!activePane) return;

    const rows = activePane.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Render Pane 1: Charging History (Filtered)
function renderChargingHistoryTabFiltered(chgLogs) {
    const container = document.getElementById('charging-history-content');
    if (!container) return;

    if (!chgLogs || !chgLogs.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 30px;">No charging history records found for the selected date filter.</p>';
        return;
    }

    const totalEnergy = chgLogs.reduce((a, c) => a + (c.energy_added_kwh || 0), 0);
    const totalCost = chgLogs.reduce((a, c) => a + (c.charging_cost_inr || 0), 0);
    const totalTimeMin = chgLogs.reduce((a, c) => a + (c.charging_time_minutes || 0), 0);

    const rowsHtml = chgLogs.map(c => `
        <tr>
            <td><code>${c.session_id}</code></td>
            <td><strong>${c.date} ${c.time ? '('+c.time+')' : ''}</strong></td>
            <td>${c.station_name}</td>
            <td><span class="badge-tag tag-cyan">${c.plug_type}</span></td>
            <td><strong>${c.energy_added_kwh} kWh</strong></td>
            <td><span class="status-badge status-info">${c.charging_time_minutes} min</span></td>
            <td><strong class="text-cyan">₹${c.charging_cost_inr.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><span class="status-badge status-ok">${c.start_battery_pct}% → ${c.end_battery_pct}%</span></td>
            <td><code>${c.charge_rate_kw} kW</code></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="kpi-cards-row margin-bottom-sm" style="grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div class="kpi-card"><span class="kpi-title">Total Charging Sessions</span><div class="kpi-value text-cyan">${chgLogs.length} Sessions</div></div>
            <div class="kpi-card"><span class="kpi-title">Total Energy Added</span><div class="kpi-value text-emerald">${totalEnergy.toFixed(1)} kWh</div></div>
            <div class="kpi-card"><span class="kpi-title">Total Charging Time</span><div class="kpi-value text-blue">${totalTimeMin} min (${(totalTimeMin/60).toFixed(1)} hrs)</div></div>
            <div class="kpi-card"><span class="kpi-title">Total Charging Cost</span><div class="kpi-value text-gold">₹${totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
        </div>

        <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Session ID</th>
                        <th>Charging Date & Time</th>
                        <th>Charging Station Hub</th>
                        <th>Plug / Tech</th>
                        <th>Energy Charged</th>
                        <th>Charging Time Taken</th>
                        <th>Session Cost (₹)</th>
                        <th>Battery % (Start → End)</th>
                        <th>Power Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// Render Pane 2: Trip History (Filtered)
function renderTripHistoryTabFiltered(trips) {
    const container = document.getElementById('trip-history-content');
    if (!container) return;

    if (!trips || !trips.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 30px;">No trip history records found for the selected date filter.</p>';
        return;
    }

    const totalDist = trips.reduce((a, c) => a + (c.trip_distance_km || 0), 0);
    const totalGross = trips.reduce((a, c) => a + (c.gross_revenue_inr || 0), 0);
    const totalProfit = trips.reduce((a, c) => a + (c.trip_profit_inr || 0), 0);

    const rowsHtml = trips.map(t => `
        <tr>
            <td><code>${t.trip_id}</code></td>
            <td><strong>${t.trip_date} ${t.trip_time ? '('+t.trip_time+')' : ''}</strong></td>
            <td>${t.trip_distance_km} km</td>
            <td>${t.trip_duration_minutes} min</td>
            <td>${t.speed_kmph || 42.5} km/h</td>
            <td><strong>₹${(t.gross_revenue_inr || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><strong class="text-cyan">₹${(t.charging_cost_inr || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><strong class="text-rose">₹${(t.maintenance_cost_inr || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><strong class="text-emerald">₹${(t.trip_profit_inr || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td><span class="status-badge status-ok">${t.trip_status || 'Completed'}</span></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="kpi-cards-row margin-bottom-sm" style="grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div class="kpi-card"><span class="kpi-title">Total Logged Trips</span><div class="kpi-value text-blue">${trips.length} Trips</div></div>
            <div class="kpi-card"><span class="kpi-title">Combined Distance</span><div class="kpi-value text-cyan">${totalDist.toFixed(1)} km</div></div>
            <div class="kpi-card"><span class="kpi-title">Gross Revenue</span><div class="kpi-value text-emerald">₹${totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
            <div class="kpi-card"><span class="kpi-title">Net Trip Profit</span><div class="kpi-value text-purple">₹${totalProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
        </div>

        <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Trip ID</th>
                        <th>Trip Date & Time</th>
                        <th>Distance (km)</th>
                        <th>Duration</th>
                        <th>Speed (km/h)</th>
                        <th>Gross Revenue (₹)</th>
                        <th>Charging Cost (₹)</th>
                        <th>Maintenance Cost (₹)</th>
                        <th>Trip Profit (₹)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// Render Pane 3: Maintenance History (Filtered)
function renderMaintenanceHistoryTabFiltered(maintLogs) {
    const container = document.getElementById('maint-history-content');
    if (!container) return;

    if (!maintLogs || !maintLogs.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 30px;">No maintenance service logs found for the selected date filter.</p>';
        return;
    }

    const totalMaintCost = maintLogs.reduce((a, c) => a + (c.maintenance_cost_inr || 0), 0);

    const rowsHtml = maintLogs.map(m => `
        <tr>
            <td><code>${m.maintenance_id}</code></td>
            <td><strong>${m.service_date}</strong></td>
            <td><span class="badge-tag tag-purple">${m.maintenance_type}</span></td>
            <td>${m.garage_name}</td>
            <td><strong class="text-rose">₹${m.maintenance_cost_inr.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            <td>${(m.odometer_km || 12000).toLocaleString()} km</td>
            <td><span class="status-badge ${m.status === 'In Garage' ? 'status-warn' : 'status-ok'}">${m.status}</span></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="kpi-cards-row margin-bottom-sm" style="grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div class="kpi-card"><span class="kpi-title">Total Maintenance Logs</span><div class="kpi-value text-purple">${maintLogs.length} Records</div></div>
            <div class="kpi-card"><span class="kpi-title">Total Maintenance Expense</span><div class="kpi-value text-rose">₹${totalMaintCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
            <div class="kpi-card"><span class="kpi-title">Service Center</span><div class="kpi-value text-emerald">${maintLogs[0].garage_name}</div></div>
        </div>

        <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Maintenance ID</th>
                        <th>Service Date</th>
                        <th>Maintenance Type</th>
                        <th>Service Center / Garage Hub</th>
                        <th>Service Cost (₹)</th>
                        <th>Odometer at Service</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// Render Pane 4: Financials & Specs Summary
function renderSummaryHistoryTab(v, d) {
    const container = document.getElementById('summary-history-content');
    if (!container) return;

    container.innerHTML = `
        <div class="detail-stats-grid margin-bottom-md">
            <div class="detail-stat-card">
                <span class="label">Vehicle Specifications</span>
                <strong>${v.manufacturer} ${v.model}</strong>
                <span class="sub-label">Battery: ${v.battery_capacity_kwh} kWh | Motor: ${v.motor_power_kw} kW (${v.motor_power_bhp} BHP)</span>
            </div>
            <div class="detail-stat-card">
                <span class="label">Odometer & Range</span>
                <strong class="text-cyan">${(v.odometer_km || 0).toLocaleString()} km</strong>
                <span class="sub-label">Claimed Range: ${v.claimed_range_km} km | Torque: ${v.total_torque_nm} Nm</span>
            </div>
            <div class="detail-stat-card">
                <span class="label">Driver Safety Profile</span>
                <strong class="text-gold">${d ? d.rating : 4.8} ★ (Score: ${d ? d.score : 88.5})</strong>
                <span class="sub-label">Behavior: ${d ? d.driving_behavior : 'Safe'} | Violations: ${d ? d.total_violations : 0}</span>
            </div>
            <div class="detail-stat-card">
                <span class="label">Total Lifetime Financials</span>
                <strong class="text-emerald">Gross: ₹${(v.gross_revenue || 0).toLocaleString()}</strong>
                <span class="sub-label">Profit: ₹${(v.trip_profit || 0).toLocaleString()} | Operating Cost: ₹${(v.operating_cost || 0).toLocaleString()}</span>
            </div>
        </div>

        <div class="detail-financial-box">
            <h3 class="box-subtitle"><i data-lucide="pie-chart"></i> Combined Charging, Maintenance & Revenue Matrix</h3>
            <div class="fin-grid">
                <div class="fin-item"><span class="lbl">Gross Fare Generated:</span> <strong>₹${(v.gross_revenue || 0).toLocaleString()}</strong></div>
                <div class="fin-item"><span class="lbl">Net Driver Revenue:</span> <strong class="text-emerald">₹${(v.net_revenue || 0).toLocaleString()}</strong></div>
                <div class="fin-item"><span class="lbl">Total Charging Cost:</span> <strong class="text-cyan">₹${(v.charging_cost || 0).toLocaleString()} (${v.charging_time_minutes || 1450} min charging)</strong></div>
                <div class="fin-item"><span class="lbl">Total Maintenance Cost:</span> <strong class="text-rose">₹${(v.maintenance_cost || 0).toLocaleString()} (${v.maintenance_type})</strong></div>
                <div class="fin-item"><span class="lbl">Net Trip Profit:</span> <strong class="text-purple">₹${(v.trip_profit || 0).toLocaleString()}</strong></div>
                <div class="fin-item"><span class="lbl">Total Energy Consumption:</span> <strong>${(v.energy_consumption_kwh || 0).toLocaleString()} kWh (${v.avg_consumption_rate_kwh_100km} kWh/100km)</strong></div>
            </div>
        </div>
    `;
}

function exportHistoryCSV() {
    if (!currentHistoryTarget || !currentHistoryTarget.vehicle) {
        if (typeof showToast === 'function') showToast('No history data active to export.');
        return;
    }
    const v = currentHistoryTarget.vehicle;
    const d = currentHistoryTarget.driver;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `LASE EV - Complete Vehicle & Driver History Log\n`;
    csvContent += `Vehicle ID,${v.vehicle_id}\n`;
    csvContent += `Model,${v.manufacturer} ${v.model}\n`;
    csvContent += `Registration,${v.registration_number}\n`;
    csvContent += `Driver Name,${d ? d.driver_name : v.driver_name} (ID: ${d ? d.driver_id : v.driver_id})\n`;
    csvContent += `Total Charging Cost (INR),${v.charging_cost}\n`;
    csvContent += `Total Charging Time (Mins),${v.charging_time_minutes}\n`;
    csvContent += `Total Maintenance Cost (INR),${v.maintenance_cost}\n`;
    csvContent += `Total Trip Profit (INR),${v.trip_profit}\n\n`;

    csvContent += "--- CHARGING HISTORY LOG ---\n";
    csvContent += "Session ID,Charging Date,Station Name,Plug Type,Energy Added (kWh),Charging Time (Mins),Charging Cost (INR),Start Battery %,End Battery %\n";
    (v.charging_history || []).forEach(c => {
        csvContent += `"${c.session_id}","${c.date}","${c.station_name}","${c.plug_type}",${c.energy_added_kwh},${c.charging_time_minutes},${c.charging_cost_inr},${c.start_battery_pct},${c.end_battery_pct}\n`;
    });

    csvContent += "\n--- MAINTENANCE HISTORY LOG ---\n";
    csvContent += "Maintenance ID,Service Date,Maintenance Type,Service Center / Garage,Service Cost (INR),Odometer (km),Status\n";
    (v.maintenance_history || []).forEach(m => {
        csvContent += `"${m.maintenance_id}","${m.service_date}","${m.maintenance_type}","${m.garage_name}",${m.maintenance_cost_inr},${m.odometer_km},"${m.status}"\n`;
    });

    csvContent += "\n--- TRIP HISTORY LOG ---\n";
    csvContent += "Trip ID,Trip Date,Distance (km),Duration (min),Gross Revenue (INR),Charging Cost (INR),Maintenance Cost (INR),Trip Profit (INR),Status\n";
    (v.trip_history || []).forEach(t => {
        csvContent += `"${t.trip_id}","${t.trip_date}",${t.trip_distance_km},${t.trip_duration_minutes},${t.gross_revenue_inr},${t.charging_cost_inr},${t.maintenance_cost_inr},${t.trip_profit_inr},"${t.trip_status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EV_History_${v.vehicle_id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') showToast(`Complete History for ${v.vehicle_id} exported to CSV!`);
}

// ==================== DRIVER & VEHICLE INTERACTIVE DETAIL MODALS ====================
function openDriverDetailModal(driverId) {
    openHistoryModal('driver', driverId);
}

function openVehicleDetailModal(vehicleId) {
    openHistoryModal('vehicle', vehicleId);
}

function closeDetailModal() {
    closeHistoryModal();
}

// ==================== LASE ASSISTANCE AI CHATBOT LOGIC ====================
function sendQuickPrompt(queryText) {
    const input = document.getElementById('lase-chat-input');
    if (input) {
        input.value = queryText;
        sendLaseAssistantMessage(queryText);
    }
}

function handleChatSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('lase-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendLaseAssistantMessage(text);
}

function sendLaseAssistantMessage(queryText) {
    const chatBox = document.getElementById('lase-chat-box');
    if (!chatBox) return;

    const userMsgHtml = `
        <div class="chat-message user-message">
            <div class="chat-content">
                <div class="chat-author">You (Administrator)</div>
                <div class="chat-text">${escapeHtml(queryText)}</div>
            </div>
            <div class="chat-avatar user-avatar"><i data-lucide="user"></i></div>
        </div>
    `;
    chatBox.insertAdjacentHTML('beforeend', userMsgHtml);

    const typingId = 'typing-' + Date.now();
    const typingHtml = `
        <div class="chat-message bot-message" id="${typingId}">
            <div class="chat-avatar bot-avatar"><i data-lucide="bot"></i></div>
            <div class="chat-content">
                <div class="chat-author">LASE ASSISTANCE</div>
                <div class="chat-text text-muted"><em>Searching fleet dataset records...</em></div>
            </div>
        </div>
    `;
    chatBox.insertAdjacentHTML('beforeend', typingHtml);
    chatBox.scrollTop = chatBox.scrollHeight;
    if (window.lucide) { lucide.createIcons(); }

    fetch('/api/lase-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
    })
    .then(res => res.json())
    .then(data => {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        const answerText = data.answer || "Data not available in the current fleet records.";
        const formattedAnswer = formatAssistantAnswerHtml(answerText);

        const botMsgHtml = `
            <div class="chat-message bot-message">
                <div class="chat-avatar bot-avatar"><i data-lucide="bot"></i></div>
                <div class="chat-content">
                    <div class="chat-author">LASE ASSISTANCE</div>
                    <div class="chat-text">${formattedAnswer}</div>
                </div>
            </div>
        `;
        chatBox.insertAdjacentHTML('beforeend', botMsgHtml);
        chatBox.scrollTop = chatBox.scrollHeight;
        if (window.lucide) { lucide.createIcons(); }
    })
    .catch(err => {
        console.error("LASE ASSISTANCE Error:", err);
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        const errHtml = `
            <div class="chat-message bot-message">
                <div class="chat-avatar bot-avatar"><i data-lucide="bot"></i></div>
                <div class="chat-content">
                    <div class="chat-author">LASE ASSISTANCE</div>
                    <div class="chat-text">Data not available in the current fleet records.</div>
                </div>
            </div>
        `;
        chatBox.insertAdjacentHTML('beforeend', errHtml);
        chatBox.scrollTop = chatBox.scrollHeight;
        if (window.lucide) { lucide.createIcons(); }
    });
}

function formatAssistantAnswerHtml(text) {
    if (!text) return "";
    let lines = text.split('\n');
    let html = lines.map(line => {
        line = escapeHtml(line);
        line = line.replace(/•\s*(.*?):/g, '<strong>• $1:</strong>');
        return line;
    }).join('<br>');
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}