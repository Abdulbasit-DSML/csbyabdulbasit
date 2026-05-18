// --- FAQ Data ---
const faqs = [
    {
        question: "Do you provide demo classes for free?",
        answer: "Yes! I offer free demo classes for IGCSE (0478), O-Level (2210), and ICT (0417) students. This is a great opportunity to experience my teaching style and see if it's the right fit for you."
    },
    {
        question: "Do you provide study materials?",
        answer: "Yes, I provide comprehensive study materials including notes, practice papers, past exam questions to each syllabus."
    },
    {
        question: "Do you offer session for October-November exam series?",
        answer: "Yes, I have an October-November exam series sessions for all 3 syllabus."
    },
    {
        question: "How are the classes conducted?",
        answer: "Classes are conducted online via video conferencing platforms like Zoom or Google Meet. This allows flexibility and comfort for students worldwide."
    },
    {
        question: "Do you provide session in English or Urdu?",
        answer: "I provide sessions in both English and Urdu, depending on the student's preference. I can switch between languages to ensure clear understanding of concepts."
    },
    {
        question: "Do you provide one-on-one sessions or group classes?",
        answer: "Yes, I offer both individual sessions and group classes. based on student's preference and learning style. Group classes can be more affordable and provide peer interaction, while one-on-one sessions allow for personalized attention."
    },
    {
        question: "How can I register for classes?",
        answer: "Simply fill out the registration form at the bottom of this page to book a free demo class."
    },
    {
        question: "What is your refund policy?",
        answer: "I offer a satisfaction guarantee. If you're not satisfied after the first demo class, there's no obligation to continue. Your satisfaction is my priority."
    }
];

const cards = document.querySelectorAll(".feature-card");

cards.forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 12;
    const y = (e.clientY - rect.top - rect.height / 2) / 12;

    card.style.transform = `translateY(-6px) rotateX(${ -y }deg) rotateY(${ x }deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "translateY(0) rotateX(0) rotateY(0)";
  });
});
// --- Initialize FAQ Section ---
function initializeFAQ() {
    const faqContainer = document.getElementById('faqContainer');
    if (!faqContainer) return;

    faqContainer.innerHTML = '';
    
    faqs.forEach((faq, index) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = `
            <div class="faq-question" onclick="toggleFAQ(this)">
                <span>${faq.question}</span>
                <span class="faq-toggle">▼</span>
            </div>
            <div class="faq-answer">
                <p>${faq.answer}</p>
            </div>
        `;
        faqContainer.appendChild(faqItem);
    });
}

function toggleFAQ(questionElement) {
    const faqItem = questionElement.parentElement;
    faqItem.classList.toggle('active');
}

// --- Slider Logic ---
let currentSlide = 0;

function updateSlider() {
    const slides = document.querySelectorAll('.review-slide');
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
    });
}

function nextSlide() {
    const slides = document.querySelectorAll('.review-slide');
    currentSlide = (currentSlide + 1) % slides.length;
    updateSlider();
}

function prevSlide() {
    const slides = document.querySelectorAll('.review-slide');
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlider();
}

// Initialize FAQ when page loads
document.addEventListener('DOMContentLoaded', initializeFAQ);