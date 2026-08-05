const API_URL = 'http://localhost:3000';

// --- 3-SECOND LOADING SCREEN & SMOOTH SCROLL ---
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('main-site').style.display = 'flex';
            
            // Load data after site appears
            loadServices();
            loadReviews();
            
            // Smoothly scroll down to the Order Form after loading
            setTimeout(() => {
                document.getElementById('orderForm').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }, 500);
            
        }, 500); // Wait 0.5s for fade-out animation
    }, 3000); // 3000ms = 3 seconds
});

// --- NAVIGATION ---
function showSection(sectionId) {
    document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
    document.getElementById(sectionId).style.display = 'flex';
}

// --- SUBMIT ORDER ---
async function submitOrder() {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const service = document.getElementById('serviceType').value;
    const details = document.getElementById('serviceDetails').value;
    if(!name || !phone || !details) return alert("Please fill in all fields!");
    try {
        const response = await fetch(`${API_URL}/api/submit-order`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, service, details })
        });
        const data = await response.json();
        if(data.success) {
            alert(`✅ Order placed for ${data.orderName}!`);
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('serviceDetails').value = '';
        } else alert("Error placing order.");
    } catch (error) { alert("Failed to connect to server."); }
}

// --- LOAD SERVICES ---
async function loadServices() {
    const list = document.getElementById('serviceList');
    try {
        const res = await fetch(`${API_URL}/api/services`);
        const data = await res.json();
        list.innerHTML = data.map(s => `
            <div class="academy-card">
                <div class="tier-header">${s.name}</div>
                <p><strong>Scope:</strong> ${s.scope}</p>
                <div class="price">Rs. ${s.price}</div>
                <p><strong>Delivery:</strong> ${s.delivery}</p>
                <p><strong>Urgent:</strong> ${s.urgent}</p>
                <p style="font-size:0.8rem; color:#a0aec0; margin-top:5px;"><strong>Best For:</strong> ${s.best_for}</p>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<p>Error loading services.</p>'; }
}

// --- SUBMIT REVIEW ---
async function submitReview() {
    const name = document.getElementById('reviewerName').value;
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    if(!name || !comment) return alert("Please enter your name and feedback!");
    
    await fetch(`${API_URL}/api/submit-review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: name, rating, comment })
    });
    alert("✅ Review submitted!");
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewComment').value = '';
    loadReviews();
}

// --- LOAD REVIEWS ---
async function loadReviews() {
    const div = document.getElementById('reviewsList');
    try {
        const res = await fetch(`${API_URL}/api/reviews`);
        const data = await res.json();
        if(data.length === 0) return div.innerHTML = '<p>No reviews yet. Be the first!</p>';
        div.innerHTML = data.map(r => `
            <div class="review-card">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${r.student_name}</strong>
                    <span style="color: #f59e0b;">${'⭐'.repeat(r.rating)}</span>
                </div>
                <p>${r.comment}</p>
                <p style="font-size:0.8rem; color:#718096; margin-top:5px;">${new Date(r.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (e) { div.innerHTML = '<p>Error loading reviews.</p>'; }
}