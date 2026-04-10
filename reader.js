// ═══════════════════════════════════════════════════════════
// READER LOGIC — O Server Brazilian
// Sistema de leitura com paginação horizontal contínua
// ═══════════════════════════════════════════════════════════

class BookReader {
  constructor() {
    this.currentBook = 1;
    this.currentPageIndex = 0; // Índice linear global (começando em 0)
    this.pageStructure = []; // Array de todas as páginas do livro
    this.totalPages = 0;
    
    this.init();
  }

  init() {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    this.currentBook = parseInt(params.get('livro')) || 1;
    const startChapter = parseInt(params.get('capitulo')) || 1;
    
    // Build page structure (split all chapters into pages)
    this.buildPageStructure();
    
    // Find starting page index (first page of requested chapter)
    if (startChapter > 1) {
      this.currentPageIndex = this.findFirstPageOfChapter(startChapter);
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load and display initial pages
    this.displayCurrentPages();
  }

  buildPageStructure() {
    const book = BOOKS_DATA[this.currentBook];
    if (!book) return;
    
    // Get the height available for page content
    const pageHeight = this.getAvailablePageHeight();
    
    // Process each chapter
    book.chapters.forEach((chapter, chapterIndex) => {
      const pages = this.splitChapterIntoPages(chapter.content, pageHeight);
      
      pages.forEach((pageContent, pageNum) => {
        this.pageStructure.push({
          chapterIndex: chapterIndex,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          content: pageContent,
          pageInChapter: pageNum + 1,
          totalPagesInChapter: pages.length,
          globalPageNum: this.pageStructure.length + 1
        });
      });
    });
    
    this.totalPages = this.pageStructure.length;
  }

  getAvailablePageHeight() {
    // Aproximately the height of a book page
    // This is the height of .book-page minus padding
    const bookPage = document.querySelector('.book-page');
    if (bookPage) {
      const styles = window.getComputedStyle(bookPage);
      const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      return bookPage.clientHeight - padding;
    }
    return 500; // Fallback
  }

  splitChapterIntoPages(htmlContent, maxHeight) {
    // Create a temporary container to measure content
    const tempContainer = document.createElement('div');
    tempContainer.className = 'page-content';
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = window.innerWidth > 1024 ? '560px' : '300px';
    tempContainer.style.height = 'auto';
    tempContainer.innerHTML = htmlContent;
    document.body.appendChild(tempContainer);
    
    const pages = [];
    const tempDiv = document.createElement('div');
    tempDiv.className = 'page-content';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = window.innerWidth > 1024 ? '560px' : '300px';
    document.body.appendChild(tempDiv);
    
    // Parse HTML into nodes
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    const nodes = Array.from(wrapper.childNodes);
    
    let currentPageHTML = '';
    
    nodes.forEach(node => {
      const nodeHTML = node.nodeType === 3 ? node.textContent : node.outerHTML;
      
      // Try adding this node to current page
      tempDiv.innerHTML = currentPageHTML + nodeHTML;
      
      if (tempDiv.scrollHeight > maxHeight && currentPageHTML !== '') {
        // Node doesn't fit, save current page and start new one
        pages.push(currentPageHTML);
        currentPageHTML = nodeHTML;
        tempDiv.innerHTML = currentPageHTML;
      } else {
        // Node fits or is first element
        currentPageHTML += nodeHTML;
      }
    });
    
    // Push the last page
    if (currentPageHTML !== '') {
      pages.push(currentPageHTML);
    }
    
    // Cleanup
    document.body.removeChild(tempContainer);
    document.body.removeChild(tempDiv);
    
    return pages.length > 0 ? pages : [htmlContent];
  }

  findFirstPageOfChapter(chapterNumber) {
    for (let i = 0; i < this.pageStructure.length; i++) {
      if (this.pageStructure[i].chapterNumber === chapterNumber) {
        return i;
      }
    }
    return 0;
  }

  displayCurrentPages() {
    const book = BOOKS_DATA[this.currentBook];
    const leftPageDiv = document.getElementById('leftPageContent');
    const rightPageDiv = document.getElementById('rightPageContent');
    const leftPageNumDiv = document.getElementById('leftPageNumber');
    const rightPageNumDiv = document.getElementById('rightPageNumber');
    
    // Get left page (current)
    const leftPage = this.pageStructure[this.currentPageIndex];
    if (leftPage) {
      leftPageDiv.innerHTML = leftPage.content;
      leftPageNumDiv.textContent = leftPage.globalPageNum;
      
      // Update header with chapter info
      document.getElementById('chapterTitle').textContent = leftPage.chapterTitle;
    }
    
    // Get right page (next), or show end of book
    const rightPage = this.pageStructure[this.currentPageIndex + 1];
    if (rightPage) {
      rightPageDiv.innerHTML = rightPage.content;
      rightPageNumDiv.textContent = rightPage.globalPageNum;
    } else {
      // End of book
      rightPageDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; text-align: center; opacity: 0.6;">
          <p style="font-family: 'Cinzel', serif; font-size: 1rem; letter-spacing: 3px; color: #8b7220; margin-bottom: 20px;">✦</p>
          <p style="font-style: italic;">Fim do livro</p>
        </div>
      `;
      rightPageNumDiv.textContent = leftPage.globalPageNum + 1;
    }
    
    // Update page indicator
    document.getElementById('currentPage').textContent = Math.floor(this.currentPageIndex / 2) + 1;
    document.getElementById('totalPages').textContent = Math.ceil(this.totalPages / 2);
    
    // Update navigation buttons
    this.updateNavigation();
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById('prevBtn').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
    
    // Click zones
    document.getElementById('prevZone').addEventListener('click', () => this.previousPage());
    document.getElementById('nextZone').addEventListener('click', () => this.nextPage());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.previousPage();
      if (e.key === 'ArrowRight') this.nextPage();
    });
    
    // Menu controls
    document.getElementById('menuBtn').addEventListener('click', () => this.openMenu());
    document.getElementById('menuClose').addEventListener('click', () => this.closeMenu());
    document.getElementById('closeBtn').addEventListener('click', () => this.closeReader());
    
    // Close menu on overlay click
    document.getElementById('menuOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'menuOverlay') this.closeMenu();
    });
  }

  nextPage() {
    // Move 2 pages forward (left + right spread)
    if (this.currentPageIndex + 2 < this.totalPages) {
      this.currentPageIndex += 2;
      this.displayCurrentPages();
    } else if (this.currentPageIndex < this.totalPages) {
      // Last page(s)
      this.currentPageIndex += 2;
      this.displayCurrentPages();
    }
  }

  previousPage() {
    // Move 2 pages backward (left + right spread)
    if (this.currentPageIndex >= 2) {
      this.currentPageIndex -= 2;
      this.displayCurrentPages();
    }
  }

  updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Disable previous if at first spread
    prevBtn.disabled = this.currentPageIndex === 0;
    
    // Disable next if at or past last pages
    nextBtn.disabled = this.currentPageIndex + 2 >= this.totalPages;
  }

  openMenu() {
    const overlay = document.getElementById('menuOverlay');
    const menuContent = document.getElementById('menuContent');
    const book = BOOKS_DATA[this.currentBook];
    
    // Build menu with chapters and their page counts
    let menuHTML = '';
    
    book.chapters.forEach((chapter, index) => {
      const firstPageOfChapter = this.findFirstPageOfChapter(chapter.number);
      const isActive = this.pageStructure[this.currentPageIndex]?.chapterNumber === chapter.number;
      
      menuHTML += `
        <div class="menu-chapter ${isActive ? 'active' : ''}" data-chapter="${chapter.number}" data-page="${firstPageOfChapter}">
          <p class="menu-chapter-number">CAPÍTULO ${this.toRoman(chapter.number)}</p>
          <h3 class="menu-chapter-title">${chapter.title.replace(/^Capítulo [IVX]+ — /, '')}</h3>
        </div>
      `;
    });
    
    menuContent.innerHTML = menuHTML;
    
    // Add click handlers
    menuContent.querySelectorAll('.menu-chapter').forEach(item => {
      item.addEventListener('click', () => {
        const pageIndex = parseInt(item.dataset.page);
        this.currentPageIndex = pageIndex;
        this.displayCurrentPages();
        this.closeMenu();
      });
    });
    
    overlay.classList.add('active');
  }

  closeMenu() {
    document.getElementById('menuOverlay').classList.remove('active');
  }

  closeReader() {
    window.location.href = `sumario-livros.html`;
  }

  toRoman(num) {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return romans[num - 1] || num.toString();
  }
}

// Initialize reader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const reader = new BookReader();
});
