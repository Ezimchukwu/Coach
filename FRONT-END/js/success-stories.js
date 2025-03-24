// Initialize AOS
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: true,
    mirror: false
});

// Initialize image loading and interactions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    AOS.init({
        duration: 1000,
        once: true
    });

    // Video Modal Functionality
    const videoModal = document.getElementById('videoModal');
    const videoFrame = document.getElementById('videoFrame');
    const videoButtons = document.querySelectorAll('.video-btn');

    videoButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const videoUrl = this.href;
            // Convert YouTube URL to embed URL
            const embedUrl = videoUrl.replace('watch?v=', 'embed/');
            videoFrame.src = embedUrl;
        });
    });

    // Clear iframe src when modal is closed
    videoModal.addEventListener('hidden.bs.modal', function() {
        videoFrame.src = '';
    });

    // Image Grid Functionality
    const images = document.querySelectorAll('.grid-img');
    const lightbox = document.querySelector('.lightbox-overlay');
    const lightboxImg = document.querySelector('.lightbox-image');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-nav.prev');
    const nextBtn = document.querySelector('.lightbox-nav.next');
    
    let currentImageIndex = 0;

    // Image loading and error handling
    images.forEach((img, index) => {
        img.setAttribute('loading', 'lazy');
        img.classList.add('loading');
        
        const tempImage = new Image();
        tempImage.src = img.src;
        
        tempImage.onload = () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
            img.style.setProperty('--i', index);
        };
        
        tempImage.onerror = () => {
            img.classList.remove('loading');
            img.classList.add('error');
            img.src = 'Images/placeholder.jpg'; // Make sure to have a placeholder image
            console.error(`Failed to load image: ${img.src}`);
        };
    });

    // Lightbox functionality
    function openLightbox(index) {
        currentImageIndex = index;
        const img = images[index];
        lightboxImg.src = img.src;
        lightboxCaption.textContent = img.dataset.caption || '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateNavButtons();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function navigateImage(direction) {
        currentImageIndex = (currentImageIndex + direction + images.length) % images.length;
        openLightbox(currentImageIndex);
    }

    function updateNavButtons() {
        prevBtn.style.display = currentImageIndex > 0 ? '' : 'none';
        nextBtn.style.display = currentImageIndex < images.length - 1 ? '' : 'none';
    }

    // Event Listeners
    images.forEach((img, index) => {
        img.parentElement.addEventListener('click', () => openLightbox(index));
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => navigateImage(-1));
    nextBtn.addEventListener('click', () => navigateImage(1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                if (currentImageIndex > 0) navigateImage(-1);
                break;
            case 'ArrowRight':
                if (currentImageIndex < images.length - 1) navigateImage(1);
                break;
        }
    });

    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0 && currentImageIndex > 0) {
                navigateImage(-1);
            } else if (swipeDistance < 0 && currentImageIndex < images.length - 1) {
                navigateImage(1);
            }
        }
    }

    // Video playlist functionality
    const playlistItems = document.querySelector('.playlist-items');
    let currentVideoIndex = 0;
    let videos = [];

    // Initialize videos array with program video data
    document.querySelectorAll('.video-btn').forEach((btn, index) => {
        const videoId = btn.getAttribute('data-video-id');
        const title = btn.getAttribute('data-video-title');
        const thumbnail = btn.getAttribute('data-thumbnail');
        const duration = btn.getAttribute('data-duration') || '3:45'; // Default duration if not specified
        
        videos.push({
            id: videoId,
            title: title || `Program Video ${index + 1}`,
            thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: duration
        });
    });

    // Function to create playlist items
    function createPlaylistItems() {
        playlistItems.innerHTML = '';
        videos.forEach((video, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === currentVideoIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div class="playlist-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="playlist-info">
                    <h4 class="playlist-title">${video.title}</h4>
                    <div class="playlist-duration">${video.duration}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                currentVideoIndex = index;
                loadVideo(video.id);
                updateActiveItem();
            });
            
            playlistItems.appendChild(item);
        });
    }

    // Function to update active playlist item
    function updateActiveItem() {
        document.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === currentVideoIndex);
        });
    }

    // Function to load video
    function loadVideo(videoId) {
        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            videoFrame.src = embedUrl;
        }
    }

    // Event listener for video modal
    videoModal.addEventListener('show.bs.modal', (event) => {
        const button = event.relatedTarget;
        const videoId = button.getAttribute('data-video-id');
        currentVideoIndex = videos.findIndex(v => v.id === videoId);
        loadVideo(videoId);
        createPlaylistItems();
    });

    videoModal.addEventListener('hidden.bs.modal', () => {
        videoFrame.src = '';
    });

    // Keyboard navigation for playlist
    document.addEventListener('keydown', (e) => {
        if (!videoModal.classList.contains('show')) return;
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentVideoIndex > 0) {
                currentVideoIndex--;
                loadVideo(videos[currentVideoIndex].id);
                updateActiveItem();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentVideoIndex < videos.length - 1) {
                currentVideoIndex++;
                loadVideo(videos[currentVideoIndex].id);
                updateActiveItem();
            }
        }
    });
});

// Initialize Swiper for testimonials
const testimonialsSwiper = new Swiper('.testimonials-slider', {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },
    breakpoints: {
        768: {
            slidesPerView: 2,
        },
        1024: {
            slidesPerView: 3,
        },
    }
}); 