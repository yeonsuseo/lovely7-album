// 몽글몽글 사진첩 클라이언트 앱
let currentMembers = [];
let sharedInfo = {
  id: "all",
  name: "모두의 추억",
  avatar: "🌈",
  color: "#FFB5A7",
  desc: "대고련 7기 친구들의 모든 소중한 순간들이 모여있어요 💖"
};
let allPhotos = [];
let allPhotosCache = [];
let allAlbumsCache = [];
let currentFilter = "all"; // member id ("all" or "m1"..."m7")
let currentView = "albums"; // "albums" | "photos"
let currentAlbumId = null; // when viewing photos in an album
let currentLightboxPhoto = null;
let selectedFile = null;
let serverInfo = null;
let portalInstance = null;

// ==========================================
// 🌀 블랙홀 차원 포털 (Black Hole Portal Engine)
// ==========================================
class BlackHolePortal {
  constructor() {
    this.portalEl = document.getElementById("blackholePortal");
    this.contentEl = document.getElementById("portalContent");
    this.canvas = document.getElementById("blackholeCanvas");
    this.flashLayer = document.getElementById("warpFlashLayer");
    this.appContainer = document.getElementById("appContainer");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    this.particles = [];
    this.particleCount = 750;
    this.animId = null;
    this.isWarping = false;
    this.warpProgress = 0; // 0 to 1
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.cx = this.width / 2;
    this.cy = this.height / 2;
    this.mouse = { x: this.cx, y: this.cy, targetX: this.cx, targetY: this.cy };

    if (!this.portalEl || !this.canvas || !this.ctx) return;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // 마우스 / 터치 인터랙션 (중력 왜곡 시차)
    window.addEventListener("mousemove", (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
    });

    // 화면 아무 곳이나 클릭/터치 시 웜홀 진입
    this.portalEl.addEventListener("click", () => this.startWarp());
    this.portalEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.startWarp();
    }, { passive: false });

    // 스페이스바나 엔터 키로도 진입 지원
    window.addEventListener("keydown", (e) => {
      if (this.portalEl && !this.portalEl.classList.contains("portal-hidden")) {
        if (e.code === "Space" || e.code === "Enter") {
          this.startWarp();
        }
      }
    });

    this.createParticles();
    this.startLoop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.cx = this.width / 2;
    this.cy = this.height / 2;
  }

  createParticles() {
    this.particles = [];
    const colorPalette = [
      { r: 255, g: 181, b: 167 }, // soft peach pink
      { r: 252, g: 213, b: 206 }, // warm cream
      { r: 184, g: 224, b: 210 }, // soft mint
      { r: 216, g: 226, b: 220 }, // ethereal sage
      { r: 200, g: 162, b: 255 }, // mystic violet
      { r: 120, g: 210, b: 255 }, // starlight cyan
      { r: 255, g: 241, b: 197 }, // soft gold
      { r: 255, g: 255, b: 255 }  // pure star white
    ];

    const minDim = Math.min(this.width, this.height);
    const maxRadius = minDim * 0.75;
    const eventHorizon = 50;

    for (let i = 0; i < this.particleCount; i++) {
      const distRatio = Math.pow(Math.random(), 1.8);
      const radius = eventHorizon + distRatio * (maxRadius - eventHorizon);
      const angle = Math.random() * Math.PI * 2;
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

      // 중심에 가까울수록 회전 속도 급증 (케플러 회전 법칙 시뮬레이션)
      const orbitalSpeed = (0.016 + (1 / (radius + 20)) * 6.5) * (0.85 + Math.random() * 0.3);

      this.particles.push({
        radius,
        baseRadius: radius,
        angle,
        speed: orbitalSpeed,
        radialInward: 0.15 + Math.random() * 0.35,
        size: 0.8 + Math.random() * 2.2,
        color,
        alpha: 0.25 + Math.random() * 0.75,
        trail: []
      });
    }
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const render = () => {
      this.update();
      this.draw();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  update() {
    // 부드러운 마우스 시차 효과
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;
    const offsetX = (this.mouse.x - this.cx) * 0.04;
    const offsetY = (this.mouse.y - this.cy) * 0.04;

    const minDim = Math.min(this.width, this.height);
    const eventHorizon = 50 * (this.isWarping ? (1 + this.warpProgress * 14) : 1);
    const maxRadius = minDim * 0.75;

    if (this.isWarping) {
      this.warpProgress = Math.min(this.warpProgress + 0.022, 1);
    }

    const warpFactor = Math.pow(this.warpProgress, 3);

    for (let p of this.particles) {
      if (this.isWarping) {
        // 워프 발동: 원 궤도를 벗어나 방사형 초공간 광속 스트릭으로 폭발
        p.angle += p.speed * (1 + warpFactor * 8);
        p.radius += (p.radius * 0.08 + 14) * (1 + warpFactor * 18);
        p.size = Math.min(p.size * 1.05, 8);
        p.alpha = Math.min(p.alpha + 0.04, 1);
      } else {
        // 평상시: 중심 블랙홀 주변을 소용돌이치며 회전
        p.angle += p.speed;
        p.radius -= p.radialInward;

        if (p.radius <= eventHorizon) {
          p.radius = maxRadius * (0.8 + Math.random() * 0.2);
          p.trail = [];
        }
      }

      const currentX = this.cx + offsetX + Math.cos(p.angle) * p.radius;
      const currentY = this.cy + offsetY + Math.sin(p.angle) * (p.radius * 0.62); // 3D 경사각

      p.trail.unshift({ x: currentX, y: currentY, radius: p.radius });
      const maxTrail = this.isWarping ? Math.floor(12 + warpFactor * 25) : 4;
      if (p.trail.length > maxTrail) {
        p.trail.pop();
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = this.cx;
    const cy = this.cy;

    ctx.fillStyle = this.isWarping ? "rgba(3, 2, 7, 0.35)" : "rgba(5, 4, 11, 0.3)";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // 1. 입자 및 광선 스트릭 그리기
    for (let p of this.particles) {
      if (p.trail.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }

      const alpha = p.alpha * (this.isWarping ? 0.95 : 0.7);
      ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.lineWidth = p.size * (this.isWarping ? (1 + this.warpProgress * 2.2) : 1);
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 1.2})`;
      ctx.beginPath();
      ctx.arc(p.trail[0].x, p.trail[0].y, p.size * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 2. 강착원반 광자구 (Accretion Ring Halo) & 중력 렌즈 효과
    const horizonR = 48 * (this.isWarping ? (1 + Math.pow(this.warpProgress, 2) * 12) : 1);
    const photonRing = ctx.createRadialGradient(cx, cy, horizonR * 0.8, cx, cy, horizonR * 2.8);
    photonRing.addColorStop(0, "rgba(255, 200, 185, 0.85)");
    photonRing.addColorStop(0.25, "rgba(255, 142, 114, 0.6)");
    photonRing.addColorStop(0.6, "rgba(180, 120, 255, 0.25)");
    photonRing.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, horizonR * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = photonRing;
    ctx.fill();
    ctx.restore();

    // 3. 중심 사건의 지평선 (완전한 암흑 특이점 - Singularity)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, horizonR, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.shadowColor = "rgba(255, 180, 160, 0.9)";
    ctx.shadowBlur = horizonR * 0.5;
    ctx.fill();
    ctx.restore();
  }

  startWarp() {
    if (this.isWarping) return;
    this.isWarping = true;

    // 안내 텍스트 페이드 아웃
    if (this.contentEl) {
      this.contentEl.classList.add("fade-out");
    }

    // 워프 플래시 (웜홀 탈출 빛의 폭발)
    setTimeout(() => {
      if (this.flashLayer) {
        this.flashLayer.classList.add("flashing");
      }
    }, 650);

    // 포털 페이드아웃 및 몽글몽글 사진첩으로 자연스러운 전환
    setTimeout(() => {
      if (this.portalEl) {
        this.portalEl.classList.add("portal-hidden");
      }
      if (this.appContainer) {
        this.appContainer.classList.add("entered");
      }
    }, 950);

    // 플래시 서서히 걷히기
    setTimeout(() => {
      if (this.flashLayer) {
        this.flashLayer.classList.remove("flashing");
      }
    }, 1350);

    // CPU 자원 절약을 위해 캔버스 애니메이션 정지
    setTimeout(() => {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }, 1900);
  }

  replay() {
    this.isWarping = false;
    this.warpProgress = 0;

    if (this.contentEl) {
      this.contentEl.classList.remove("fade-out");
    }
    if (this.portalEl) {
      this.portalEl.classList.remove("portal-hidden");
    }
    if (this.appContainer) {
      this.appContainer.classList.remove("entered");
    }

    this.createParticles();
    this.startLoop();
  }
}

// 초기 로딩
document.addEventListener("DOMContentLoaded", () => {
  portalInstance = new BlackHolePortal();
  initApp();
  setupEventListeners();
});

async function initApp() {
  await loadServerInfo();
  await loadMembers();
  await loadAlbums();
  await loadPhotos();
  renderBreadcrumbs();
  renderAlbums();
}

// 1. 서버 정보 불러오기 (Anti_PIC 경로 및 모바일 접속 IP)
async function loadServerInfo() {
  try {
    const res = await fetch("/api/info");
    if (res.ok) {
      serverInfo = await res.json();
      const pathEl = document.getElementById("storagePathDisplay");
      if (pathEl) {
        pathEl.textContent = "남해 바다 어딘가";
        if (serverInfo.storage_path) {
          pathEl.title = `저장 위치: ${serverInfo.storage_path}`;
        }
      }
    }
  } catch (err) {
    console.error("서버 정보 로드 실패:", err);
  }
}

// 2. 멤버 목록 불러오기
async function loadMembers() {
  try {
    const res = await fetch("/api/members");
    if (res.ok) {
      const data = await res.json();
      if (data.shared) {
        sharedInfo = data.shared;
        currentMembers = data.members || [];
      } else if (Array.isArray(data)) {
        currentMembers = data;
      }
      renderMembersFilter();
      renderMemberSelect();
      updateThemeAndBanner(currentFilter);
    }
  } catch (err) {
    console.error("멤버 로드 실패:", err);
  }
}

// 3. 앨범 목록 메모리 캐시 및 불러오기
async function loadAlbums(silent = false) {
  try {
    const res = await fetch("/api/albums");
    if (res.ok) {
      allAlbumsCache = await res.json();
      if (currentView === "albums") {
        renderAlbums();
      }
      renderUploadAlbumSelect();
    }
  } catch (err) {
    if (!silent) console.error("앨범 로드 실패:", err);
  }
}

// 4. 사진 목록 메모리 캐시 및 초고속 동기화
async function loadPhotos(silent = false) {
  try {
    const res = await fetch("/api/photos");
    if (res.ok) {
      allPhotosCache = await res.json();
      if (currentView === "photos" && currentAlbumId) {
        renderPhotosForAlbum(currentAlbumId);
      } else if (currentView === "albums") {
        renderAlbums();
      }
    }
  } catch (err) {
    if (!silent) console.error("사진 로드 실패:", err);
  }
}

// 네비게이션: 멤버 앨범 목록으로 돌아가기
function navigateToMemberAlbums() {
  currentView = "albums";
  currentAlbumId = null;
  renderBreadcrumbs();
  renderAlbums();
}

// 네비게이션: 특정 앨범 열기
function openAlbum(albumId) {
  currentView = "photos";
  currentAlbumId = albumId;
  renderBreadcrumbs();
  renderPhotosForAlbum(albumId);
}

// 상단 경로 표시줄 (Breadcrumb) 갱신
function renderBreadcrumbs() {
  const crumbMemberAvatar = document.getElementById("crumbMemberAvatar");
  const crumbMemberName = document.getElementById("crumbMemberName");
  const crumbSeparator = document.getElementById("crumbSeparator");
  const crumbActiveAlbum = document.getElementById("crumbActiveAlbum");
  const crumbAlbumName = document.getElementById("crumbAlbumName");
  const crumbPhotoCountBadge = document.getElementById("crumbPhotoCountBadge");
  const btnBackToAlbums = document.getElementById("btnBackToAlbums");
  const btnEditCurrentAlbum = document.getElementById("btnEditCurrentAlbum");
  const btnCreateAlbum = document.getElementById("btnCreateAlbum");

  // 멤버 이름 및 아바타
  let memberName = "모두의 추억";
  let memberAvatar = "🌈";
  if (currentFilter === "all") {
    memberName = sharedInfo.name || "모두의 추억";
    memberAvatar = sharedInfo.avatar || "🌈";
  } else {
    const m = currentMembers.find(item => item.id === currentFilter);
    if (m) {
      memberName = m.name;
      memberAvatar = m.avatar;
    }
  }

  if (crumbMemberAvatar) crumbMemberAvatar.textContent = memberAvatar;
  if (crumbMemberName) crumbMemberName.textContent = memberName;

  if (currentView === "photos" && currentAlbumId) {
    const album = allAlbumsCache.find(a => a.id === currentAlbumId);
    const albumPhotos = allPhotosCache.filter(p => p.album_id === currentAlbumId);

    if (crumbSeparator) crumbSeparator.style.display = "inline";
    if (crumbActiveAlbum) crumbActiveAlbum.style.display = "inline-flex";
    if (crumbAlbumName) crumbAlbumName.textContent = album ? album.name : "앨범";
    if (crumbPhotoCountBadge) crumbPhotoCountBadge.textContent = `${albumPhotos.length}장`;

    if (btnBackToAlbums) btnBackToAlbums.style.display = "inline-flex";
    if (btnEditCurrentAlbum) btnEditCurrentAlbum.style.display = "inline-flex";
    if (btnCreateAlbum) btnCreateAlbum.style.display = "none";
  } else {
    if (crumbSeparator) crumbSeparator.style.display = "none";
    if (crumbActiveAlbum) crumbActiveAlbum.style.display = "none";
    if (btnBackToAlbums) btnBackToAlbums.style.display = "none";
    if (btnEditCurrentAlbum) btnEditCurrentAlbum.style.display = "none";
    if (btnCreateAlbum) btnCreateAlbum.style.display = "inline-flex";
  }
}

// 4. 멤버 필터 바 렌더링
function renderMembersFilter() {
  const container = document.getElementById("membersFilterBar");
  if (!container) return;

  container.innerHTML = `
    <button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-member-id="all">
      <span class="chip-avatar">${sharedInfo.avatar || '🌈'}</span>
      <span class="chip-name">${escapeHtml(sharedInfo.name || '모두의 추억')}</span>
    </button>
  `;

  currentMembers.forEach(m => {
    const btn = document.createElement("button");
    btn.className = `filter-chip ${currentFilter === m.id ? 'active' : ''}`;
    btn.dataset.memberId = m.id;
    btn.innerHTML = `
      <span class="chip-avatar">${m.avatar}</span>
      <span class="chip-name">${escapeHtml(m.name)}</span>
    `;
    btn.addEventListener("click", () => {
      setFilter(m.id);
    });
    container.appendChild(btn);
  });

  // "모두의 추억" 클릭 이벤트
  container.querySelector('[data-member-id="all"]').addEventListener("click", () => {
    setFilter("all");
  });
}

function hexToRgb(hex) {
  if (!hex) return { r: 255, g: 226, b: 209 };
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map(x => x + x).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 255, g: 226, b: 209 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function updateThemeAndBanner(memberId) {
  const ambientLayer = document.getElementById("ambientLayer");
  const blob1 = document.getElementById("blob1");
  const blob2 = document.getElementById("blob2");
  const blob3 = document.getElementById("blob3");
  const banner = document.getElementById("memberDescBanner");
  const bannerAvatar = document.getElementById("memberDescAvatar");
  const bannerBadge = document.getElementById("memberDescBadge");
  const bannerText = document.getElementById("memberDescText");

  // 1. 배너 페이드 아웃 애니메이션
  if (banner) {
    banner.classList.add("fade-out");
  }

  setTimeout(() => {
    if (memberId === "all") {
      // 모두의 추억 커스텀 색상으로 포근하게 전환
      const { r, g, b } = hexToRgb(sharedInfo.color || "#FFB5A7");
      document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.04)`;
      if (ambientLayer) {
        ambientLayer.style.background = `radial-gradient(ellipse at 50% 20%, rgba(${r}, ${g}, ${b}, 0.18) 0%, rgba(${r}, ${g}, ${b}, 0.04) 65%, transparent 100%)`;
        ambientLayer.style.opacity = "0.85";
      }
      if (blob1) blob1.style.background = `rgba(${r}, ${g}, ${b}, 0.45)`;
      if (blob2) blob2.style.background = "#E8F4F8";
      if (blob3) blob3.style.background = "#FEECE9";

      if (bannerAvatar) bannerAvatar.textContent = sharedInfo.avatar || "🌈";
      if (bannerBadge) {
        bannerBadge.textContent = sharedInfo.name || "모두의 추억";
        bannerBadge.style.background = `rgba(${r}, ${g}, ${b}, 0.18)`;
        bannerBadge.style.color = `rgb(${Math.max(0, Math.floor(r * 0.6))}, ${Math.max(0, Math.floor(g * 0.6))}, ${Math.max(0, Math.floor(b * 0.6))})`;
      }
      if (bannerText) {
        bannerText.textContent = sharedInfo.desc || "대고련 7기 친구들의 모든 소중한 순간들이 모여있어요 💖";
      }
    } else {
      const member = currentMembers.find(m => m.id === memberId);
      if (member) {
        const { r, g, b } = hexToRgb(member.color || "#FFB5A7");

        // 멤버 테마 색상으로 배경 및 구름 블롭이 부드럽게 페이드인/페이드아웃
        document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.05)`;
        if (ambientLayer) {
          ambientLayer.style.background = `radial-gradient(ellipse at 50% 20%, rgba(${r}, ${g}, ${b}, 0.22) 0%, rgba(${r}, ${g}, ${b}, 0.06) 65%, transparent 100%)`;
          ambientLayer.style.opacity = "1";
        }
        if (blob1) blob1.style.background = `rgba(${r}, ${g}, ${b}, 0.52)`;
        if (blob2) blob2.style.background = `rgba(${r}, ${g}, ${b}, 0.32)`;
        if (blob3) blob3.style.background = `rgba(${r}, ${g}, ${b}, 0.4)`;

        // 배너 내용 및 뱃지 색상 갱신
        if (bannerAvatar) bannerAvatar.textContent = member.avatar;
        if (bannerBadge) {
          bannerBadge.textContent = member.name;
          bannerBadge.style.background = `rgba(${r}, ${g}, ${b}, 0.2)`;
          bannerBadge.style.color = `rgb(${Math.max(0, Math.floor(r * 0.6))}, ${Math.max(0, Math.floor(g * 0.6))}, ${Math.max(0, Math.floor(b * 0.6))})`;
        }
        if (bannerText) {
          const descStr = member.desc && member.desc.trim() ? `"${escapeHtml(member.desc)}"` : "소중한 대고련 7기 멤버 ✨";
          bannerText.innerHTML = `${descStr}`;
        }
      }
    }

    // 2. 배너 페이드 인 애니메이션
    if (banner) {
      banner.classList.remove("fade-out");
    }
  }, 180);
}

function setFilter(memberId) {
  currentFilter = memberId;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    if (chip.dataset.memberId === memberId) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
  updateThemeAndBanner(memberId);
  // 멤버 변경 시 해당 멤버의 몽글몽글 앨범 목록 화면으로 전환
  currentView = "albums";
  currentAlbumId = null;
  renderBreadcrumbs();
  renderAlbums();
  renderUploadAlbumSelect();
}

// 5. 업로드 모달용 멤버 선택 및 앨범 선택 드롭다운 렌더링
function renderMemberSelect() {
  const select = document.getElementById("memberSelect");

  if (select) {
    select.innerHTML = `
      <option value="all">🌈 공용 (모두 함께 찍은 사진)</option>
    `;

    currentMembers.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.avatar} ${m.name} (${m.desc || ''})`;
      select.appendChild(opt);
    });
  }
}

function renderUploadAlbumSelect(preferredAlbumId = null) {
  const select = document.getElementById("uploadAlbumSelect");
  const memberSelect = document.getElementById("memberSelect");
  if (!select) return;

  select.innerHTML = "";
  const selectedMember = memberSelect ? memberSelect.value : (currentFilter !== "all" ? currentFilter : "all");

  // 해당 멤버의 앨범들과 공용 앨범 표시
  let availableAlbums = allAlbumsCache.filter(a => a.member_id === selectedMember || a.member_id === "all");
  if (availableAlbums.length === 0) {
    availableAlbums = allAlbumsCache;
  }

  availableAlbums.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    const ownerName = a.member_id === "all" ? "공용" : (currentMembers.find(m => m.id === a.member_id)?.name || "");
    opt.textContent = `📂 ${a.name} (${ownerName})`;
    select.appendChild(opt);
  });

  if (preferredAlbumId && availableAlbums.some(a => a.id === preferredAlbumId)) {
    select.value = preferredAlbumId;
  } else if (currentAlbumId && availableAlbums.some(a => a.id === currentAlbumId)) {
    select.value = currentAlbumId;
  } else if (availableAlbums.length > 0) {
    select.value = availableAlbums[0].id;
  }
}

// 6-A. 몽글몽글 앨범 폴더 목록 렌더링
function renderAlbums() {
  const albumGrid = document.getElementById("albumGrid");
  const galleryGrid = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("emptyState");

  if (galleryGrid) galleryGrid.style.display = "none";
  if (albumGrid) {
    albumGrid.style.display = "grid";
    albumGrid.innerHTML = "";
  }

  // 현재 필터(멤버 또는 all)의 앨범 필터링
  let memberAlbums = [];
  if (currentFilter === "all") {
    memberAlbums = allAlbumsCache.filter(a => a.member_id === "all");
  } else {
    memberAlbums = allAlbumsCache.filter(a => a.member_id === currentFilter);
  }

  // 전체 사진 수 배너 갱신
  const memberPhotos = currentFilter === "all" ? allPhotosCache : allPhotosCache.filter(p => p.member_id === currentFilter);
  updateTotalCount(memberPhotos.length);

  if (emptyState) emptyState.style.display = "none";

  // 앨범 폴더 카드 렌더링
  memberAlbums.forEach(album => {
    const albumPhotos = allPhotosCache.filter(p => p.album_id === album.id);
    const isDefault = album.id === "album_all_default" || album.id.endsWith("_default");

    // 폴더 안에서 삐져나온 폴라로이드 사진 썸네일 미리보기 (최대 3장)
    let previewHtml = "";
    if (albumPhotos.length > 0) {
      const covers = albumPhotos.slice(0, 3);
      const polaroidsHtml = covers.map((p, idx) => `
        <div class="folder-polaroid pos-${idx + 1}">
          <img src="/photos/${encodeURIComponent(p.filename)}" alt="${escapeHtml(p.caption || '사진')}" loading="lazy">
        </div>
      `).join("");
      previewHtml = `<div class="folder-preview-area">${polaroidsHtml}</div>`;
    } else {
      previewHtml = `
        <div class="folder-preview-area">
          <div class="folder-empty-preview">
            <span class="folder-empty-icon">☁️</span>
            <span>아직 사진이 없어요</span>
          </div>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "folder-card";
    card.innerHTML = `
      <div class="folder-tab">
        <span>📂 앨범</span>
      </div>
      <div class="folder-body">
        ${previewHtml}
        <div class="folder-footer">
          <div class="folder-title-row">
            <span class="folder-title" title="${escapeHtml(album.name)}">${escapeHtml(album.name)}</span>
            <span class="folder-badge">${albumPhotos.length}장의 추억</span>
          </div>
          <div class="folder-actions-row">
            <span class="folder-owner-tag">
              <span>✨</span> 클릭해서 보기
            </span>
            <div class="folder-buttons">
              <button class="btn-folder-action btn-rename" title="앨범 이름 수정" data-album-id="${album.id}">
                ✏️
              </button>
              ${!isDefault ? `
              <button class="btn-folder-action btn-del" title="앨범 삭제" data-album-id="${album.id}">
                🗑️
              </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // 폴더 클릭 시 앨범 내부 세부 사진 화면으로 이동
    card.addEventListener("click", () => {
      openAlbum(album.id);
    });

    // ✏️ 앨범 이름 수정 버튼
    card.querySelector(".btn-rename")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openRenameAlbumModal(album);
    });

    // 🗑️ 앨범 삭제 버튼
    card.querySelector(".btn-del")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteAlbum(album.id);
    });

    albumGrid.appendChild(card);
  });

  // 그리드 맨 뒤에 [+ 새 앨범 만들기] 감성 카드 추가
  const addCard = document.createElement("div");
  addCard.className = "create-album-card";
  addCard.innerHTML = `
    <span class="create-album-icon">📂</span>
    <span class="create-album-text">+ 새 앨범 만들기</span>
    <span class="create-album-sub">소중한 테마별로 추억을 모아보세요 ✨</span>
  `;
  addCard.addEventListener("click", () => {
    openCreateAlbumModal();
  });
  albumGrid.appendChild(addCard);
}

// 6-B. 특정 앨범의 세부 사진 렌더링
function renderPhotosForAlbum(albumId) {
  const albumGrid = document.getElementById("albumGrid");
  const galleryGrid = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("emptyState");

  if (albumGrid) albumGrid.style.display = "none";
  if (galleryGrid) {
    galleryGrid.style.display = "grid";
    galleryGrid.innerHTML = "";
  }

  const albumPhotos = allPhotosCache.filter(p => p.album_id === albumId);
  const album = allAlbumsCache.find(a => a.id === albumId);
  updateTotalCount(albumPhotos.length);

  if (albumPhotos.length === 0) {
    if (emptyState) {
      emptyState.style.display = "block";
      const emptyTitle = document.getElementById("emptyTitle");
      const emptySubText = document.getElementById("emptySubText");
      const emptyActionBtn = document.getElementById("emptyActionBtn");
      if (emptyTitle) emptyTitle.textContent = `[${album ? album.name : '이 앨범'}]에 아직 사진이 없어요!`;
      if (emptySubText) emptySubText.innerHTML = `우측 상단의 <b>[사진 올리기]</b>를 눌러<br>이 앨범에 첫 번째 추억을 채워보세요 🌸`;
      if (emptyActionBtn) emptyActionBtn.textContent = "이 앨범에 사진 올리기 📸";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  renderGalleryPhotos(albumPhotos);
}

// 6-C. 갤러리 현재 뷰 새로고침 (앨범/사진 모드 호환)
function renderGallery() {
  if (currentView === "photos" && currentAlbumId) {
    renderPhotosForAlbum(currentAlbumId);
  } else {
    renderAlbums();
  }
}

// 6-D. 사진 그리드 렌더링
function renderGalleryPhotos(photosToRender) {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  photosToRender.forEach(photo => {
    const member = currentMembers.find(m => m.id === photo.member_id) || {
      name: photo.author || "친구",
      avatar: "🌸",
      color: "#FFB5A7"
    };

    const commentsCount = (photo.comments && Array.isArray(photo.comments)) ? photo.comments.length : 0;

    const card = document.createElement("div");
    card.className = "photo-card";
    card.innerHTML = `
      <div class="photo-img-wrap">
        <img src="/photos/${encodeURIComponent(photo.filename)}" alt="${escapeHtml(photo.caption || '사진')}" loading="lazy">
      </div>
      <div class="photo-info">
        <div class="photo-author-row">
          <span class="author-badge" style="background: ${member.color}22; color: #4A3B32;">
            <span>${member.avatar}</span>
            <span>${escapeHtml(member.name)}</span>
          </span>
          <span class="photo-date">${escapeHtml(photo.date || '')}</span>
        </div>
        <p class="photo-caption">${escapeHtml(photo.caption || '따스한 추억 한 장 💖')}</p>
        <div class="photo-card-footer">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn-card-like" data-id="${photo.id}" title="하트 누르기">
              <span class="heart-icon">❤️</span>
              <span class="like-count">${photo.likes || 0}</span>
            </button>
            <span class="card-comment-badge" title="댓글 수">
              <span>💬</span>
              <span>${commentsCount}</span>
            </span>
          </div>
          <span style="font-size: 0.8rem; color: #A0948C;">자세히 보기 🔍</span>
        </div>
      </div>
    `;

    // 좋아요 버튼 클릭 이벤트
    const likeBtn = card.querySelector(".btn-card-like");
    likeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleLike(photo.id, likeBtn);
    });

    // 카드 클릭 시 라이트박스 오픈
    card.addEventListener("click", () => {
      openLightbox(photo);
    });

    grid.appendChild(card);
  });
}

function updateTotalCount(count) {
  const el = document.getElementById("totalPhotosCount");
  if (el) el.textContent = count;
}

// 7. 좋아요 처리
async function handleLike(photoId, buttonEl) {
  try {
    const res = await fetch(`/api/photos/${photoId}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const countEl = buttonEl.querySelector(".like-count");
      if (countEl) countEl.textContent = data.likes;
      buttonEl.classList.add("liked");
      setTimeout(() => buttonEl.classList.remove("liked"), 500);

      // 현재 메모리 캐시 및 데이터 업데이트
      const pCache = allPhotosCache.find(item => item.id === photoId);
      if (pCache) pCache.likes = data.likes;
      const p = allPhotos.find(item => item.id === photoId);
      if (p) p.likes = data.likes;
      if (currentLightboxPhoto && currentLightboxPhoto.id === photoId) {
        document.getElementById("lightboxLikeCount").textContent = data.likes;
      }
    }
  } catch (err) {
    console.error("좋아요 처리 실패:", err);
  }
}

// 8. 라이트박스 (확대 보기)
function openLightbox(photo) {
  currentLightboxPhoto = photo;
  const member = currentMembers.find(m => m.id === photo.member_id) || {
    name: photo.author || "친구",
    avatar: "🌸"
  };

  const imgEl = document.getElementById("lightboxImg");
  const avatarEl = document.getElementById("lightboxAvatar");
  const authorEl = document.getElementById("lightboxAuthor");
  const dateEl = document.getElementById("lightboxDate");
  const captionEl = document.getElementById("lightboxCaption");
  const likeCountEl = document.getElementById("lightboxLikeCount");
  const downloadBtn = document.getElementById("btnLightboxDownload");

  const photoUrl = `/photos/${encodeURIComponent(photo.filename)}`;
  imgEl.src = photoUrl;
  avatarEl.textContent = member.avatar;
  authorEl.textContent = member.name;
  dateEl.textContent = photo.date || "";
  captionEl.textContent = photo.caption || "남겨진 메모가 없습니다.";
  likeCountEl.textContent = photo.likes || 0;

  downloadBtn.href = photoUrl;
  downloadBtn.download = photo.filename;

  openModal("lightboxModal");
  renderLightboxComments(photo);
}

// 8-1. 라이트박스 댓글 목록 렌더링 (100% 익명 지원)
function renderLightboxComments(photo) {
  const listEl = document.getElementById("lightboxCommentsList");
  const countEl = document.getElementById("lightboxCommentCount");
  if (!listEl) return;

  const comments = (photo && photo.comments && Array.isArray(photo.comments)) ? photo.comments : [];
  if (countEl) countEl.textContent = comments.length;

  if (comments.length === 0) {
    listEl.innerHTML = `<div class="comment-empty">아직 댓글이 없어요. 익명으로 첫 번째 따뜻한 한마디를 남겨보세요! 💭</div>`;
    return;
  }

  listEl.innerHTML = "";
  comments.forEach(c => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <div class="comment-avatar" style="background: #FFF0EB; border-color: #FFD4C4;">
        <span>☁️</span>
      </div>
      <div class="comment-body">
        <div class="comment-header-row">
          <span class="comment-author-name">익명</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="comment-date">${escapeHtml(c.date || '')}</span>
            <button type="button" class="btn-delete-comment" title="댓글 삭제" onclick="handleDeleteComment('${photo.id}', '${c.id}')">&times;</button>
          </div>
        </div>
        <p class="comment-text">${escapeHtml(c.content)}</p>
      </div>
    `;
    listEl.appendChild(item);
  });

  // 새 댓글 시 스크롤 맨 아래로 이동
  listEl.scrollTop = listEl.scrollHeight;
}

// 8-2. 댓글 등록 처리 (100% 익명)
async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!currentLightboxPhoto) return;

  const inputEl = document.getElementById("commentTextInput");
  const content = inputEl?.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`/api/photos/${currentLightboxPhoto.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "익명",
        member_id: "anon",
        content: content
      })
    });

    if (res.ok) {
      const data = await res.json();
      currentLightboxPhoto.comments = data.comments;

      // 전체 사진 캐시 및 피드 뱃지 즉시 갱신
      const pInCache = allPhotosCache.find(p => p.id === currentLightboxPhoto.id);
      if (pInCache) pInCache.comments = data.comments;
      const pInAll = allPhotos.find(p => p.id === currentLightboxPhoto.id);
      if (pInAll) pInAll.comments = data.comments;

      inputEl.value = "";
      renderLightboxComments(currentLightboxPhoto);
      renderGallery();
      showToast("익명 댓글이 등록되었습니다! 💖");
    } else {
      const err = await res.json();
      alert(err.detail || "댓글 등록에 실패했습니다.");
    }
  } catch (err) {
    alert("댓글 등록 오류: " + err.message);
  }
}

// 8-3. 댓글 삭제 처리
async function handleDeleteComment(photoId, commentId) {
  if (!confirm("정말로 이 댓글을 삭제하시겠어요?")) return;

  try {
    const res = await fetch(`/api/photos/${photoId}/comments/${commentId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      const data = await res.json();
      if (currentLightboxPhoto && currentLightboxPhoto.id === photoId) {
        currentLightboxPhoto.comments = data.comments;
        renderLightboxComments(currentLightboxPhoto);
      }
      const pCache = allPhotosCache.find(p => p.id === photoId);
      if (pCache) pCache.comments = data.comments;
      const pInAll = allPhotos.find(p => p.id === photoId);
      if (pInAll) pInAll.comments = data.comments;
      renderGallery();
      showToast("댓글이 삭제되었습니다.");
    } else {
      alert("댓글 삭제에 실패했습니다.");
    }
  } catch (err) {
    alert("댓글 삭제 오류: " + err.message);
  }
}

// 9. 업로드 및 이벤트 처리
function setupEventListeners() {
  // 모달 및 포털 트리거
  document.getElementById("btnReplayPortal")?.addEventListener("click", () => portalInstance?.replay());
  document.getElementById("btnOpenUpload")?.addEventListener("click", openUploadModal);
  document.getElementById("btnOpenMembers")?.addEventListener("click", openMembersModal);
  document.getElementById("btnOpenShare")?.addEventListener("click", openShareModal);

  // 앨범 생성 및 이름 수정 폼 제출
  document.getElementById("albumForm")?.addEventListener("submit", handleAlbumSubmit);

  // 업로드 모달 내 멤버 선택 변경 시 앨범 목록 동적 갱신
  document.getElementById("memberSelect")?.addEventListener("change", () => renderUploadAlbumSelect());

  // 댓글 등록 폼 제출
  document.getElementById("commentForm")?.addEventListener("submit", handleCommentSubmit);

  // 라이트박스 액션
  document.getElementById("btnLightboxLike")?.addEventListener("click", () => {
    if (currentLightboxPhoto) {
      handleLike(currentLightboxPhoto.id, document.getElementById("btnLightboxLike"));
    }
  });

  document.getElementById("btnLightboxDelete")?.addEventListener("click", () => {
    if (currentLightboxPhoto) {
      handleDeletePhoto(currentLightboxPhoto.id);
    }
  });

  // 드롭존 인터랙션
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("drag-over");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files[0]) {
        handleFileSelect(dt.files[0]);
      }
    });
  }

  // 업로드 폼 제출
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!selectedFile) {
        alert("업로드할 사진을 먼저 선택해주세요!");
        return;
      }

      const submitBtn = document.getElementById("btnSubmitUpload");
      const progressArea = document.getElementById("uploadProgressArea");
      const progressBarFill = document.getElementById("progressBarFill");
      const percentText = document.getElementById("uploadPercentText");
      const statusText = document.getElementById("uploadStatusText");

      // UI 진행 상태 표시
      submitBtn.disabled = true;
      submitBtn.textContent = "업로드 진행 중... ⏳";
      if (progressArea) {
        progressArea.style.display = "block";
        progressBarFill.style.width = "0%";
        percentText.textContent = "0%";
        statusText.innerHTML = '<span class="spinner-dot">☁️</span> 사진을 안전하게 전송하는 중...';
      }

      const memberSelect = document.getElementById("memberSelect");
      const selectedMember = currentMembers.find(m => m.id === memberSelect.value);
      const authorName = selectedMember ? selectedMember.name : "공용";
      const uploadAlbumId = document.getElementById("uploadAlbumSelect")?.value || "album_all_default";

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("member_id", memberSelect.value);
      formData.append("album_id", uploadAlbumId);
      formData.append("author", authorName);
      formData.append("caption", document.getElementById("photoCaption").value);

      const dateVal = document.getElementById("photoDate").value;
      if (dateVal) {
        formData.append("date", dateVal);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      // 실시간 업로드 진행률 및 시간 안내 이벤트
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          if (progressBarFill) progressBarFill.style.width = percent + "%";
          if (percentText) percentText.textContent = percent + "%";
          if (statusText) {
            if (percent < 100) {
              const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (event.total / (1024 * 1024)).toFixed(1);
              statusText.innerHTML = `<span class="spinner-dot">☁️</span> 사진 전송 중 (${loadedMB}MB / ${totalMB}MB)...`;
            } else {
              statusText.innerHTML = '<span class="spinner-dot">🫧</span> 바탕화면 Anti_PIC 폴더에 저장하는 중... 잠시만 기다려주세요!';
            }
          }
        }
      });

      xhr.onload = async () => {
        if (xhr.status === 200) {
          if (progressBarFill) progressBarFill.style.width = "100%";
          if (percentText) percentText.textContent = "100%";
          if (statusText) statusText.innerHTML = '✨ 사진첩에 성공적으로 저장되었습니다!';

          setTimeout(async () => {
            closeModal("uploadModal");
            resetFileSelection();
            uploadForm.reset();
            if (progressArea) progressArea.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.textContent = "사진 등록하기 💖";
            await loadAlbums();
            await loadPhotos();
            showToast("소중한 사진이 사진첩에 등록되었습니다! 🌸");
          }, 600);
        } else {
          let errorMsg = "업로드에 실패했습니다.";
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.detail) errorMsg = res.detail;
          } catch(err) {}
          alert("업로드 실패: " + errorMsg);
          submitBtn.disabled = false;
          submitBtn.textContent = "사진 등록하기 💖";
          if (progressArea) progressArea.style.display = "none";
        }
      };

      xhr.onerror = () => {
        alert("서버 연결에 실패했습니다. 사진첩 서버가 실행 중인지 확인해주세요.");
        submitBtn.disabled = false;
        submitBtn.textContent = "사진 등록하기 💖";
        if (progressArea) progressArea.style.display = "none";
      };

      xhr.send(formData);
    });
  }
}

function handleFileSelect(file) {
  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 선택할 수 있습니다! (JPG, PNG, GIF, WEBP, HEIC)");
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("imagePreview").src = e.target.result;
    document.getElementById("dropZonePrompt").style.display = "none";
    document.getElementById("previewContainer").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function resetFileSelection() {
  selectedFile = null;
  const fileInput = document.getElementById("fileInput");
  if (fileInput) fileInput.value = "";
  document.getElementById("imagePreview").src = "";
  document.getElementById("previewContainer").style.display = "none";
  document.getElementById("dropZonePrompt").style.display = "block";
  const progressArea = document.getElementById("uploadProgressArea");
  if (progressArea) progressArea.style.display = "none";
}

function openUploadModal() {
  // 오늘 날짜를 기본값으로
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("photoDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = today;
  }

  // 멤버 선택 기본값
  const memberSelect = document.getElementById("memberSelect");
  if (memberSelect) {
    memberSelect.value = currentFilter !== "all" ? currentFilter : "all";
  }

  // 등록할 앨범 드롭다운 갱신
  renderUploadAlbumSelect(currentAlbumId);
  openModal("uploadModal");
}

// 10. 사진 삭제 처리
async function handleDeletePhoto(photoId) {
  if (!confirm("정말로 이 사진을 삭제하시겠어요? 바탕화면 Anti_PIC 폴더에서도 삭제됩니다.")) {
    return;
  }

  try {
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) {
      closeModal("lightboxModal");
      await loadAlbums();
      await loadPhotos();
      showToast("사진이 삭제되었습니다.");
    } else {
      alert("사진 삭제에 실패했습니다.");
    }
  } catch (err) {
    alert("삭제 오류: " + err.message);
  }
}

// 10-A. 빈 화면 액션 버튼 처리
function handleEmptyAction() {
  if (currentView === "photos") {
    openUploadModal();
  } else {
    openCreateAlbumModal();
  }
}

// 10-B. 새 앨범 만들기 모달 오픈
function openCreateAlbumModal() {
  const titleEl = document.getElementById("albumModalTitle");
  const idInput = document.getElementById("albumEditId");
  const nameInput = document.getElementById("albumNameInput");
  const memberGroup = document.getElementById("albumMemberGroup");
  const memberSelect = document.getElementById("albumMemberSelect");

  if (titleEl) titleEl.textContent = "📂 새 앨범 만들기";
  if (idInput) idInput.value = "";
  if (nameInput) nameInput.value = "";
  if (memberGroup) memberGroup.style.display = "block";

  if (memberSelect) {
    memberSelect.innerHTML = `<option value="all">🌈 ${escapeHtml(sharedInfo.name || '모두의 추억')}</option>`;
    currentMembers.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.avatar} ${m.name}`;
      memberSelect.appendChild(opt);
    });
    memberSelect.value = currentFilter !== "all" ? currentFilter : "all";
  }

  openModal("albumModal");
  setTimeout(() => nameInput?.focus(), 200);
}

// 10-C. 앨범 이름 수정 (Rename) 모달 오픈
function openRenameAlbumModal(album) {
  const titleEl = document.getElementById("albumModalTitle");
  const idInput = document.getElementById("albumEditId");
  const nameInput = document.getElementById("albumNameInput");
  const memberGroup = document.getElementById("albumMemberGroup");

  if (titleEl) titleEl.textContent = "✏️ 앨범 이름 수정";
  if (idInput) idInput.value = album.id;
  if (nameInput) nameInput.value = album.name;
  if (memberGroup) memberGroup.style.display = "none";

  openModal("albumModal");
  setTimeout(() => nameInput?.focus(), 200);
}

function openRenameCurrentAlbumModal() {
  if (!currentAlbumId) return;
  const album = allAlbumsCache.find(a => a.id === currentAlbumId);
  if (album) {
    openRenameAlbumModal(album);
  }
}

// 10-D. 앨범 모달 제출 처리 (생성 또는 이름 수정)
async function handleAlbumSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById("albumEditId");
  const nameInput = document.getElementById("albumNameInput");
  const memberSelect = document.getElementById("albumMemberSelect");
  const editId = idInput ? idInput.value.trim() : "";
  const name = nameInput ? nameInput.value.trim() : "";

  if (!name) {
    alert("앨범 이름을 입력해주세요!");
    return;
  }

  try {
    if (editId) {
      // 앨범 이름 수정 (Rename)
      const res = await fetch(`/api/albums/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        const inCache = allAlbumsCache.find(a => a.id === editId);
        if (inCache) inCache.name = data.album.name;
        closeModal("albumModal");
        renderBreadcrumbs();
        if (currentView === "albums") {
          renderAlbums();
        }
        renderUploadAlbumSelect();
        showToast("앨범 이름이 수정되었습니다! ✨");
      } else {
        const err = await res.json();
        alert(err.detail || "앨범 수정에 실패했습니다.");
      }
    } else {
      // 새 앨범 생성
      const member_id = memberSelect ? memberSelect.value : (currentFilter !== "all" ? currentFilter : "all");
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, member_id })
      });
      if (res.ok) {
        const data = await res.json();
        allAlbumsCache.push({
          id: data.album.id,
          name: data.album.name,
          member_id: data.album.member_id,
          created_at: data.album.created_at,
          photo_count: 0,
          covers: []
        });
        closeModal("albumModal");
        renderUploadAlbumSelect();
        // 소속 멤버 화면으로 이동 또는 현재 화면 갱신
        if (currentFilter !== data.album.member_id) {
          setFilter(data.album.member_id);
        } else {
          renderAlbums();
        }
        showToast("새 앨범이 생성되었습니다! 📂");
      } else {
        const err = await res.json();
        alert(err.detail || "앨범 생성에 실패했습니다.");
      }
    }
  } catch (err) {
    alert("앨범 처리 오류: " + err.message);
  }
}

// 10-E. 앨범 삭제 처리 (사진은 안전하게 기본 앨범으로 이전 보존)
async function handleDeleteAlbum(albumId) {
  if (!confirm("정말로 이 앨범을 삭제하시겠어요?\n앨범 안의 사진들은 기본 앨범으로 안전하게 보존됩니다. 💖")) {
    return;
  }
  try {
    const res = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
    if (res.ok) {
      await loadAlbums();
      await loadPhotos();
      showToast("앨범이 삭제되었습니다. (사진은 기본 앨범으로 보존)");
    } else {
      const err = await res.json();
      alert(err.detail || "앨범 삭제 실패");
    }
  } catch (err) {
    alert("삭제 오류: " + err.message);
  }
}

// 11. 모바일 / 외부 공유 모달
function openShareModal() {
  const hasCloudflare = !!(serverInfo && serverInfo.cloudflare_url && serverInfo.cloudflare_active);
  const hasNgrok = !!(serverInfo && serverInfo.ngrok_url && serverInfo.ngrok_active);
  let shareUrl = "";

  // 아무런 버튼이나 입력 없이 누르자마자 0초 만에 바로 열리는 Cloudflare 직통 주소를 최우선 지정
  if (hasCloudflare) {
    shareUrl = serverInfo.cloudflare_url;
  } else if (hasNgrok) {
    shareUrl = serverInfo.ngrok_url;
  } else if (serverInfo && serverInfo.tunnel_url) {
    shareUrl = serverInfo.tunnel_url.replace(/^https:\/\//i, "http://");
  } else {
    shareUrl = "http://lovely7.loca.lt";
  }

  const inputEl = document.getElementById("shareUrlInput");
  if (inputEl) inputEl.value = shareUrl;

  const badgeTitle = document.getElementById("shareBadgeTitle");
  if (badgeTitle) {
    if (hasCloudflare) {
      badgeTitle.textContent = "⚡ 0초 직통 주소 (버튼/비밀번호 전혀 없음!)";
    } else if (hasNgrok) {
      badgeTitle.textContent = "🔒 평생 고정 주소";
    } else {
      badgeTitle.textContent = "⚡ Lovely 7 직통 주소";
    }
  }

  const pwdNotice = document.getElementById("shareZeroPwdNotice");
  if (pwdNotice) {
    if (hasCloudflare) {
      pwdNotice.innerHTML = "✨ <b>아무런 버튼이나 비밀번호 없이</b> 링크를 누르거나 QR을 찍으면 0초 만에 바로 열립니다!";
    } else if (hasNgrok) {
      pwdNotice.innerHTML = "✨ <b>영구 고정 주소</b>입니다. (첫 접속 시 [Visit Site] 버튼 클릭)";
    } else {
      pwdNotice.innerHTML = "💡 첫 접속 시 영문 창에서 아래 비밀번호를 입력해주세요.";
    }
  }

  const pwdEl = document.getElementById("tunnelPasswordDisplay");
  if (pwdEl && serverInfo && serverInfo.tunnel_password) {
    pwdEl.textContent = serverInfo.tunnel_password;
  }

  const wifiInput = document.getElementById("localWifiUrlInput");
  if (wifiInput && serverInfo && serverInfo.local_ips && serverInfo.local_ips.length > 0) {
    wifiInput.value = `http://${serverInfo.local_ips[0]}:${serverInfo.port || 8000}/`;
  }

  const statusBadge = document.getElementById("tunnelStatusBadge");
  if (statusBadge) {
    if (serverInfo && (serverInfo.cloudflare_active || serverInfo.ngrok_active || serverInfo.tunnel_active)) {
      statusBadge.textContent = "● 연결 활성화";
      statusBadge.style.display = "inline-block";
    } else {
      statusBadge.textContent = "● 연결 준비 중";
    }
  }

  const qrContainer = document.getElementById("qrcode");
  if (qrContainer) {
    qrContainer.innerHTML = "";
    if (typeof QRCode !== "undefined") {
      new QRCode(qrContainer, {
        text: shareUrl,
        width: 160,
        height: 160,
        colorDark: "#332C27",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = `<p style="font-size:0.9rem; color:#888;">주소로 접속해주세요:<br><b>${shareUrl}</b></p>`;
    }
  }

  openModal("shareModal");
}

function copyShareUrl() {
  const inputEl = document.getElementById("shareUrlInput");
  if (inputEl) {
    inputEl.select();
    navigator.clipboard.writeText(inputEl.value).then(() => {
      showToast("0초 직통 주소가 복사되었습니다! ⚡");
    }).catch(() => {
      document.execCommand("copy");
      showToast("0초 직통 주소가 복사되었습니다! ⚡");
    });
  }
}

function copyTunnelPassword() {
  const pwd = document.getElementById("tunnelPasswordDisplay")?.textContent || "211.108.237.138";
  navigator.clipboard.writeText(pwd).then(() => {
    showToast(`비밀번호 [${pwd}]가 복사되었습니다! 🔑`);
  }).catch(() => {
    showToast(`비밀번호: ${pwd}`);
  });
}

function copyKakaoInvite() {
  const shareUrl = document.getElementById("shareUrlInput")?.value || (serverInfo?.cloudflare_url || serverInfo?.ngrok_url || "http://lovely7.loca.lt");
  const hasCloudflare = !!(serverInfo && serverInfo.cloudflare_url);
  
  let msg = "";
  if (hasCloudflare) {
    msg = `[대고련 7기 몽글몽글 사진첩 ☁️]\n우리들의 소중한 순간들이 모이는 사진첩에 초대합니다! 💖\n\n👉 바로 접속 링크 (누르면 0초 만에 바로 열려요!):\n${shareUrl}\n\n스마트폰 카메라로 QR을 찍거나 위 링크를 누르면 바로 열립니다 ✨`;
  } else {
    msg = `[대고련 7기 몽글몽글 사진첩 ☁️]\n우리들의 소중한 순간들이 모이는 사진첩에 초대합니다! 💖\n\n👉 바로 접속 링크:\n${shareUrl}`;
  }

  navigator.clipboard.writeText(msg).then(() => {
    showToast("카카오톡 초대 문구가 복사되었습니다! 카톡 대화방에 붙여넣기 해보세요 💬");
  }).catch(() => {
    showToast("초대 문구가 복사되었습니다!");
  });
}

function copyLocalWifiUrl() {
  const wifiInput = document.getElementById("localWifiUrlInput");
  if (wifiInput) {
    wifiInput.select();
    navigator.clipboard.writeText(wifiInput.value).then(() => {
      showToast("로컬 Wi-Fi 주소가 복사되었습니다! 🏠");
    }).catch(() => {
      showToast("로컬 Wi-Fi 주소가 복사되었습니다!");
    });
  }
}

// 12. 멤버 관리 모달
function openMembersModal() {
  const container = document.getElementById("membersEditList");
  if (!container) return;

  container.innerHTML = `
    <div class="member-edit-header">
      <span style="width: 42px; text-align: center;">이모지</span>
      <span style="width: 80px; text-align: center;">이름</span>
      <span style="flex: 1; padding-left: 6px;">소개 / 태그</span>
      <span style="width: 32px; text-align: center;">색상</span>
    </div>
    <!-- 모두의 추억 편집 행 -->
    <div class="member-edit-item shared-item" id="sharedEditRow" title="모두의 추억 공용 설정">
      <input type="text" class="member-edit-avatar" id="editSharedAvatar" value="${sharedInfo.avatar || '🌈'}" maxlength="2" title="이모지 변경">
      <input type="text" class="member-edit-name" id="editSharedName" value="${escapeHtml(sharedInfo.name || '모두의 추억')}" placeholder="공용 이름">
      <input type="text" class="member-edit-desc" id="editSharedDesc" value="${escapeHtml(sharedInfo.desc || '')}" placeholder="모두의 추억 소개 멘트">
      <input type="color" class="member-edit-color" id="editSharedColor" value="${sharedInfo.color || '#FFB5A7'}" title="모두의 추억 배경 색상">
    </div>
    <div class="member-edit-divider">대고련 7기 개인 멤버 (7명)</div>
  `;

  currentMembers.forEach((m, idx) => {
    const row = document.createElement("div");
    row.className = "member-edit-item";
    row.innerHTML = `
      <input type="text" class="member-edit-avatar" value="${m.avatar}" maxlength="2" title="이모지 변경">
      <input type="text" class="member-edit-name" value="${escapeHtml(m.name)}" placeholder="이름">
      <input type="text" class="member-edit-desc" value="${escapeHtml(m.desc || '')}" placeholder="한 줄 소개">
      <input type="color" class="member-edit-color" value="${m.color || '#FFB5A7'}" title="대표 색상">
    `;
    container.appendChild(row);
  });

  openModal("membersModal");
}

function showToast(message) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

async function saveMembers() {
  const items = document.querySelectorAll(".member-edit-item:not(.shared-item)");
  const updated = [];

  items.forEach((item, idx) => {
    const avatar = item.querySelector(".member-edit-avatar").value.trim() || "🌸";
    const name = item.querySelector(".member-edit-name").value.trim() || `멤버${idx + 1}`;
    const desc = item.querySelector(".member-edit-desc").value.trim();
    const color = item.querySelector(".member-edit-color").value;

    updated.push({
      id: currentMembers[idx] ? currentMembers[idx].id : `m${idx + 1}`,
      avatar,
      name,
      desc,
      color
    });
  });

  const updatedShared = {
    id: "all",
    avatar: document.getElementById("editSharedAvatar")?.value.trim() || "🌈",
    name: document.getElementById("editSharedName")?.value.trim() || "모두의 추억",
    desc: document.getElementById("editSharedDesc")?.value.trim() || "",
    color: document.getElementById("editSharedColor")?.value || "#FFB5A7"
  };

  try {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members: updated, shared: updatedShared })
    });

    if (res.ok) {
      currentMembers = updated;
      sharedInfo = updatedShared;
      renderMembersFilter();
      renderMemberSelect();
      renderGallery();
      updateThemeAndBanner(currentFilter);
      closeModal("membersModal");
      showToast("멤버 및 모두의 추억이 성공적으로 저장되었습니다! ✨");
    }
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
}

// 모달 공통 제어
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("show");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("show");
  }
}

// 팝업창은 오직 X 버튼이나 취소 버튼을 눌렀을 때만 닫히도록 설정 (빈 곳 클릭 시 닫힘 방지)

// 헬퍼: XSS 방지
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 15초마다 백그라운드 무소음 동기화 (친구들이 올린 새 사진/댓글 자동 반영)
setInterval(() => {
  if (document.visibilityState === "visible") {
    loadPhotos(true);
  }
}, 15000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadPhotos(true);
  }
});
