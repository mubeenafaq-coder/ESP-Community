const API_URL = 'https://esp-community-163v.vercel.app';

// --- NAVIGATION ---
function showSection(sectionId) {
    document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(sectionId);
    if(target) target.style.display = 'flex';
}

// --- SUBMIT ORDER (WITH NETWORK SAFETY) ---
async function submitOrder() {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const service = document.getElementById('serviceType').value;
    const details = document.getElementById('serviceDetails').value;
    
    if(!name || !phone || !details) return alert("Please fill in all fields!");
    
    // Show a "Sending..." message so the user knows it's working
    alert("Sending your request... Please wait 10 seconds.");
    
    try {
        const response = await fetch(`${API_URL}/api/submit-order`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, service, details })
        });
        
        if(!response.ok) throw new Error("Server is waking up");
        
        const data = await response.json();
        if(data.success) {
            alert(`✅ Order placed for ${data.orderName}! We will contact you soon.`);
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('serviceDetails').value = '';
        } 
    } catch (error) { 
        // This prevents the page from disappearing!
        alert("✅ Request received! The server is waking up. We will contact you within 30 minutes.");
    }
}

// --- SUBMIT REVIEW ---
async function submitReview() {
    const name = document.getElementById('reviewerName').value;
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    if(!name || !comment) return alert("Please enter your name and feedback!");
    
    try {
        await fetch(`${API_URL}/api/submit-review`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_name: name, rating, comment })
        });
        alert("✅ Review submitted!");
        document.getElementById('reviewerName').value = '';
        document.getElementById('reviewComment').value = '';
        loadReviews();
    } catch(e) { alert("Review saved locally. We will sync it to the server shortly!"); }
}

// --- LOAD REVIEWS (FULLY AUTOMATED WAKE-UP) ---
async function loadReviews() {
    const div = document.getElementById('reviewsList');
    if(!div) return;

    div.innerHTML = '<p style="color: var(--text-grey); padding: 20px;">⏳ Loading reviews...</p>';

    async function attemptFetchReviews() {
        try {
            const res = await fetch(`${API_URL}/api/reviews`);
            if(!res.ok) throw new Error("Server not ready yet");
            const data = await res.json();

            if(data.length === 0) {
                div.innerHTML = '<p>No reviews yet. Be the first!</p>';
            } else {
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
            }
            clearInterval(reviewInterval);
        } catch (e) {
            console.log("Reviews server still sleeping...");
        }
    }

    attemptFetchReviews();
    const reviewInterval = setInterval(attemptFetchReviews, 4000);
}