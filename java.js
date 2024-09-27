const counters = document.querySelectorAll('.count');
counters.forEach(counter => {
  const updateCount = () => {
    const target = +counter.getAttribute('data-target');
    const current = +counter.innerText;
    const increment = target / 200; // Adjust this for speed

    if (current < target) {
      counter.innerText = Math.ceil(current + increment);
      setTimeout(updateCount, 20);
    } else {
      counter.innerText = target;
    }
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateCount();
        observer.unobserve(counter);
      }
    });
  });

  observer.observe(counter);
});




// // Example to move the view to a different image
// viewer.on('image', function (event) {
//   console.log('Currently showing image: ', event.imageId);
// });


// Intersection Observer for Rectangle Animation
document.addEventListener("DOMContentLoaded", () => {
  const rectangle = document.querySelector(".rectangle");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        rectangle.classList.add("slide-in");
      }
    });
  });

  observer.observe(rectangle);
});

// Helper function to check if the element is in the viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0
  );
}

// Function to add 'in-view' class to elements in the viewport
function checkTabsInView() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    if (isInViewport(tab)) {
      tab.classList.add('in-view');
    }
  });
}




function openTab(evt, tabName) {
  var i, tabcontent, tablinks;

  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = "";
  }

  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.style.backgroundColor = "#29a1f2"; // Change to your primary color
}

// Set default tab
document.getElementById("innovation").style.display = "block";


    const apiKey = '16a42969c1424ceb879197d2e62c760a'; // Replace with your NewsAPI key
const url = `https://newsapi.org/v2/everything?q=crypto&apiKey=${apiKey}`;

function fetchCryptoNews() {
fetch(url)
.then(response => response.json())
.then(data => {
const newsGrid = document.getElementById('newsGrid');
newsGrid.innerHTML = ''; // Clear existing news

// Limit to 6 news articles
const articlesToDisplay = data.articles.slice(0, 5);

articlesToDisplay.forEach(article => {
    const newsItem = document.createElement('article');
    newsItem.classList.add('news-item');

    newsItem.innerHTML = `
        <h3 style="font-size: 16px;">${article.title}</h3>
        <p style="font-size: 14px; color="rgb(31, 61, 137)">${article.description || 'No description available.'}</p>
        <a href="${article.url}" class="read-more" target="_blank">Read More</a>
    `;

    newsGrid.appendChild(newsItem);
});
})
.catch(error => console.error('Error fetching news:', error));
}

// Fetch news on page load
document.addEventListener('DOMContentLoaded', () => {
fetchCryptoNews();
// Fetch news every minute
setInterval(fetchCryptoNews, 60000);
});





document.addEventListener("DOMContentLoaded", function() {
    const tabs = document.querySelectorAll('.tab');
    const testimonials = document.querySelectorAll('.testimonial');
    let currentIndex = 0;
    let autoSwipeInterval;

    // Function to show the testimonial at the current index
    function showTestimonial(index) {
        // Remove 'active' class from all tabs
        tabs.forEach(tab => tab.classList.remove('active'));
        // Hide all testimonials
        testimonials.forEach(testimonial => testimonial.style.display = 'none');
        
        // Add 'active' class to the selected tab
        tabs[index].classList.add('active');
        // Show the testimonial corresponding to the selected tab
        testimonials[index].style.display = 'block';
    }

    // Function to start automatic swiping
    function startAutoSwipe() {
        autoSwipeInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonials.length; // Loop back to the first if at the end
            showTestimonial(currentIndex);
        }, 5000); // Change every 5 seconds
    }

    // Function to stop automatic swiping
    function stopAutoSwipe() {
        clearInterval(autoSwipeInterval);
    }

    // Add click event listeners for manual tab switching
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', function() {
            stopAutoSwipe(); // Stop auto-swiping if the user interacts
            showTestimonial(index); // Show the clicked testimonial
            currentIndex = index; // Update the current index
            startAutoSwipe(); // Restart auto-swiping after user interaction
        });
    });

    // Initialize by showing the first testimonial
    showTestimonial(currentIndex);
    // Start the auto-swiping
    startAutoSwipe();
});










document.addEventListener('DOMContentLoaded', function() {
    // Get all links on the page
    const links = document.querySelectorAll('a');
  
    // Add click event listener to all links
    links.forEach(link => {
      link.addEventListener('click', function(event) {
        // Check if the link has an href attribute (some might not)
        if (this.href && !this.href.includes('#')) { // Avoid loading for anchor links
          // Show the loading spinner
          document.getElementById('loading-spinner').style.display = 'flex';
        }
      });
    });
  
    // Hide the spinner when the page is fully loaded
    window.addEventListener('load', function() {
      document.getElementById('loading-spinner').style.display = 'none';
    });
  });







const testimonials = document.querySelectorAll('.testimonial');
const dots = document.querySelectorAll('.dot');

let currentIndex = 0;

// Function to show the testimonial at the current index
function showTestimonial(index) {
// Hide all testimonials
testimonials.forEach(testimonial => {
testimonial.style.display = 'none';
});

// Remove the active class from all dots
dots.forEach(dot => {
dot.classList.remove('active');
});

// Show the selected testimonial
testimonials[index].style.display = 'block';

// Set the active dot
dots[index].classList.add('active');
}

// Add click event listeners to the dots
dots.forEach((dot, index) => {
dot.addEventListener('click', () => {
currentIndex = index; // Update the current index
showTestimonial(currentIndex); // Show the selected testimonial
});
});

// Show the first testimonial by default
showTestimonial(currentIndex);

// FAQ toggle functionality
document.querySelectorAll('.faq-question').forEach(item => {
            item.addEventListener('click', function () {
                const answer = this.nextElementSibling;

                // Toggle visibility of answer
                if (answer.style.display === "block") {
                    answer.style.display = "none";
                } else {
                    answer.style.display = "block";
                }
            });
        });

        // Scroll-based animations
        function handleScroll() {
            const elements = document.querySelectorAll('.slide-in');
            elements.forEach(element => {
                const position = element.getBoundingClientRect().top;
                const screenPosition = window.innerHeight / 1.3;

                if (position < screenPosition) {
                    element.classList.add('visible');
                }
            });
}

        window.addEventListener('scroll', handleScroll);





          // Restrict deposit amount based on selected plan
document.addEventListener('DOMContentLoaded', function() {
            const depositAmountInput = document.getElementById('deposit-amount');
            const depositButton = document.getElementById('deposit-button');
            const depositError = document.getElementById('deposit-error');
            const planRadioButtons = document.querySelectorAll('input[name="plan"]');
            
            const planLimits = {
                'plan-1': { min: 50, max: 999 },
                'plan-2': { min: 1000, max: 4999 },
                'plan-3': { min: 5000, max: Infinity }
            };

            let selectedPlan = null;

            planRadioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    selectedPlan = planLimits[this.value];
                    depositError.textContent = ''; // Clear any previous errors
                });
            });

            depositButton.addEventListener('click', function(event) {
                event.preventDefault();
                const depositAmount = parseFloat(depositAmountInput.value);

                if (selectedPlan) {
                    if (depositAmount < selectedPlan.min || depositAmount > selectedPlan.max) {
                        depositError.textContent = `Deposit amount must be between $${selectedPlan.min} and $${selectedPlan.max}`;
                    } else {
                        // Proceed with form submission
                        depositError.textContent = ''; // Clear error
                        // You can submit the form here or do further processing
                    }
                } else {
                    depositError.textContent = 'Please select a plan';
                }
            });
});

