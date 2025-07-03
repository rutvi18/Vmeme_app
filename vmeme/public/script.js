// public/script.js
const API_BASE_URL = 'http://localhost:3000/api'; // Make sure this matches your backend port

// UI Elements
const authSection = document.getElementById('authSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const uploadMemeBtn = document.getElementById('uploadMemeBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');

const memeUploadSection = document.getElementById('memeUploadSection');
const memeUploadForm = document.getElementById('memeUploadForm');
const memesContainer = document.getElementById('memesContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');

let currentPage = 1;
let totalPages = 1;
let userToken = localStorage.getItem('jwtToken');
let currentUsername = localStorage.getItem('username');

// --- Helper Functions ---

function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

function updateUI() {
    if (userToken) {
        authSection.style.display = 'none';
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        uploadMemeBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
        welcomeMessage.style.display = 'inline-block';
        welcomeMessage.textContent = `Welcome, ${currentUsername}!`;
        memeUploadSection.style.display = 'inline'; // Show upload section for logged-in users
        showSection('memeFeed'); // Always show meme feed
    } else {
        authSection.style.display = 'block';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        uploadMemeBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        welcomeMessage.style.display = 'none';
        memeUploadSection.style.display = 'none'; // Hide upload section
        showSection('authSection'); // Default to auth section
    }
    fetchMemes(); // Always load memes on UI update
}

async function fetchMemes() {
    try {
        const response = await fetch(`${API_BASE_URL}/memes?page=${currentPage}&limit=10`);
        const data = await response.json();

        data.memes.forEach(meme => {
            const memeCard = document.createElement('div');
            memeCard.className = 'meme-card';
            memeCard.innerHTML = `
                <img src="${meme.imageUrl}" alt="${meme.title}" loading="lazy">
                <div class="meme-info">
                    <h3>${meme.title}</h3>
                    <p>By: ${meme.uploader ? meme.uploader.username : 'Unknown'}</p>
                    <p>Tags: ${meme.tags.join(', ')}</p>
                    <div class="meme-actions">
                        <button class="like-btn" data-id="${meme._id}">Like (${meme.likes.length})</button>
                        <button class="comment-btn" data-id="${meme._id}">Comment</button>
                    </div>
                    <div class="comments-section" data-id="${meme._id}" style="display:none;">
                        <h4>Comments:</h4>
                        <ul class="comment-list">
                            ${meme.comments.map(comment => `
                                <li><strong>${comment.user ? comment.user.username : 'Unknown'}:</strong> ${comment.text}</li>
                            `).join('')}
                        </ul>
                        <form class="add-comment-form" data-id="${meme._id}">
                            <input type="text" placeholder="Add a comment..." required>
                            <button type="submit">Post</button>
                        </form>
                    </div>
                </div>
            `;
            memesContainer.appendChild(memeCard);
        });

        totalPages = data.totalPages;
        if (currentPage >= totalPages) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }

        attachMemeEventListeners(); // Attach listeners to newly added memes

    } catch (error) {
        console.error('Error fetching memes:', error);
    }
}

function attachMemeEventListeners() {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = handleLike;
    });
    document.querySelectorAll('.comment-btn').forEach(button => {
        button.onclick = toggleCommentsSection;
    });
    document.querySelectorAll('.add-comment-form').forEach(form => {
        form.onsubmit = handleAddComment;
    });
}

async function handleAuth(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('jwtToken', result.token);
            localStorage.setItem('username', result.username);
            userToken = result.token;
            currentUsername = result.username;
            alert(`${endpoint} successful!`);
            updateUI();
        } else {
            alert(`Error ${endpoint}: ${result.message}`);
        }
    } catch (error) {
        console.error(`Error during ${endpoint}:`, error);
        alert(`Network error during ${endpoint}.`);
    }
}

async function handleMemeUpload(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('memeTitle').value);
    formData.append('tags', document.getElementById('memeTags').value);
    formData.append('memeImage', document.getElementById('memeImage').files[0]);

    try {
        const response = await fetch(`${API_BASE_URL}/memes/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` },
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('Meme uploaded successfully!');
            memeUploadForm.reset();
            memesContainer.innerHTML = ''; // Clear existing memes
            currentPage = 1; // Reset page to load from start
            fetchMemes(); // Reload memes
        } else {
            alert(`Error uploading meme: ${result.message}`);
        }
    } catch (error) {
        console.error('Error uploading meme:', error);
        alert('Network error during meme upload.');
    }
}

async function handleLike(event) {
    const memeId = event.target.dataset.id;
    if (!userToken) {
        alert('Please login to like memes.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/memes/${memeId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` },
        });
        const result = await response.json();
        if (response.ok) {
            event.target.textContent = `Like (${result.likesCount})`;
            alert(result.message);
        } else {
            alert(`Error liking meme: ${result.message}`);
        }
    } catch (error) {
        console.error('Error liking meme:', error);
        alert('Network error during like operation.');
    }
}

function toggleCommentsSection(event) {
    const memeId = event.target.dataset.id;
    const commentsSection = document.querySelector(`.comments-section[data-id="${memeId}"]`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
}

async function handleAddComment(event) {
    event.preventDefault();
    const memeId = event.target.dataset.id;
    const commentInput = event.target.querySelector('input');
    const commentText = commentInput.value;

    if (!userToken) {
        alert('Please login to add comments.');
        return;
    }
    if (!commentText.trim()) {
        alert('Comment cannot be empty.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/memes/${memeId}/comment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ text: commentText })
        });
        const result = await response.json();
        if (response.ok) {
            const commentList = document.querySelector(`.comments-section[data-id="${memeId}"] .comment-list`);
            const newCommentItem = document.createElement('li');
            newCommentItem.innerHTML = `<strong>${result.comment.user.username}:</strong> ${result.comment.text}`;
            commentList.appendChild(newCommentItem);
            commentInput.value = ''; // Clear input
            alert('Comment added successfully!');
        } else {
            alert(`Error adding comment: ${result.message}`);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Network error during comment operation.');
    }
}


// --- Event Listeners ---

// Auth form toggles
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login/Register submission
loginForm.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    handleAuth('login', { username, password });
});

registerForm.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    handleAuth('register', { username, email, password });
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
    userToken = null;
    currentUsername = null;
    alert('Logged out successfully!');
    memesContainer.innerHTML = ''; // Clear memes
    currentPage = 1; // Reset page
    updateUI(); // Update UI to logged out state
});

// Meme Upload
memeUploadForm.addEventListener('submit', handleMemeUpload);

// Load More Memes
loadMoreBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchMemes();
    } else {
        alert('No more memes to load!');
    }
});


// Initial UI update on page load
document.addEventListener('DOMContentLoaded', updateUI);