/**
 * Matrix effect on a Canvas https://jcubic.github.io/cmatrix/
 *
 * Copyright (c) 2021-2023 Jakub T. Jankiewicz <https://jcubic.pl/me>
 * Released under MIT license
 *
 * The code was started at this Codepen https://codepen.io/jcubic/pen/rNeNwgB
 * And was based on code by Michael Goodman https://codepen.io/goodmanmr1/pen/jpPeRR
 *
 */
var katagana = gen_unicode(0x30a1, 0x30f6);
var hiragana = gen_unicode(0x3041, 0x3096);

// ---------------------------------------------------------------
class Matrix {
    constructor(
        canvas,
        {
            chars = null,
            font_size = 18,
            width,
            height,
            font = "monospace",
            color,
            background,
        } = {}
    ) {
        this._canvas = canvas;
        if (this._canvas._matrix) {
            this._canvas._matrix.stop();
            this._canvas._matrix.clear();
        }
        this._canvas._matrix = this;
        this._ctx = canvas.getContext("2d");
        this._font_size = font_size;
        this._drops = [];
        this._color = color;
        this._background = background;
        this._font = font;
        this._chars = chars ? chars : katagana.concat(hiragana);
        this.resize(width, height);
        Matrix.messages = [
            "3",
            "2",
            "1",
            "Happy birthday",
            "25.06.2003",
            "Nguyễn Bảo Hân",
            "Chúc em sinh nhật vui vẻ",
            "Có tất cả trừ vất vả"
        ];
        Matrix.currentMessageIndex = 0;
        Matrix.nextMessageIndex = 1;
        Matrix.ledParticles = [];
        Matrix.morphing = false;
        Matrix.morphProgress = 0;
        Matrix.lastSwitchTime = 0;
        Matrix.showHeart = false;
        Matrix.fallingImages = [
          " a1.jfif",
            "a2.jfif"
        ];
        Matrix.loadedImages = [];
        Matrix.fallingState = null;
    }
    random_char() {
        return rnd(this._chars);
    }
    render_char(char, x, y) {
        this._ctx.fillText(char, x, y);
    }
    start() {
        if (this._run) {
            return;
        }
        let frames = 0;
        this._run = true;
        const self = this;
        (function loop() {
            if (self._run) {
                if (frames++ % 2 === 0) {
                    self.render(); // slower render
                }
                requestAnimationFrame(loop);
            }
        })();
    }
    stop() {
        this._run = false;
    }
    reset() {
        for (let x = 0; x < this._columns; x++) {
            this._drops[x] = 255;
        }
    }
    resize(width, height) {
        this._width = width;
        this._height = height;
        this.clear();
        this._canvas.width = width;
        setTimeout(() => {
            this._canvas.height = height;
            this.reset();
        }, 0);
        this._columns = Math.round(width / this._font_size);
    }
    clear() {
        this._ctx.fillStyle = this._background;
        this._ctx.fillRect(0, 0, this._width, this._height);
        this._ctx.fillStyle = this._color;
        this._ctx.font = this._font_size + "px " + this._font;
    }
    fullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    getLedPoints(text, font, width, height, density = 8) {
        const off = document.createElement("canvas");
        off.width = width;
        off.height = height;
        const ctx = off.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(text, width / 2, height / 2);
        const img = ctx.getImageData(0, 0, width, height).data;
        const points = [];
        for (let y = 0; y < height; y += density) {
            for (let x = 0; x < width; x += density) {
                const idx = (y * width + x) * 4 + 3;
                if (img[idx] > 128) points.push({ x, y });
            }
        }
        return points;
    }
    render() {
        this.clear();
        // Đặt màu ký tự rơi là gradient tím-hồng
        let gradient = this._ctx.createLinearGradient(0, 0, this._width, 0);
        gradient.addColorStop(0, "#d291ff");
        gradient.addColorStop(1, "#ff8ae2");
        this._ctx.fillStyle = gradient;
        for (let col = 0; col < this._drops.length; col++) {
            const char = this.random_char();
            const x = col * this._font_size;
            const y = this._drops[col] * this._font_size;
            this.render_char(char, x, y);
            if (y > this._height && Math.random() > 0.975) {
                this._drops[col] = 0;
            }
            this._drops[col]++;
        }

        // Nếu đã hết các câu chữ, chỉ hiển thị hiệu ứng trái tim
        if (Matrix.showHeart) {
            this.renderHeart();
            return;
        }

        // Hiệu ứng LED grid morphing chữ ở giữa màn hình (bling mờ ảo)
        const width = this._width;
        const height = this._height;
        const fontSize = Math.floor(Math.min(width, height) / 7);
        const font = `bold ${fontSize}px Arial, Roboto, 'sans-serif'`;
        const density = Math.max(3, Math.floor(Math.min(width, height) / 70));
        const now = performance.now();
        const time = now / 500; // tốc độ bling

        if (!Matrix.morphing) {
            const points = this.getLedPoints(
                Matrix.messages[Matrix.currentMessageIndex],
                font,
                width,
                height,
                density
            );
            // Thêm phase ngẫu nhiên cho hiệu ứng bling
            Matrix.ledParticles = points.map((pt) => ({
                x: pt.x,
                y: pt.y,
                tx: pt.x,
                ty: pt.y,
                alpha: 1,
                phase: Math.random() * Math.PI * 2,
            }));
            for (let p of Matrix.ledParticles) {
                this._ctx.save();
                this._ctx.beginPath();
                this._ctx.arc(p.x, p.y, density / 2.5, 0, 2 * Math.PI);
                this._ctx.fillStyle = "#fff";
                // Hiệu ứng bling: alpha dao động nhẹ
                const blingAlpha = 0.7 + 0.3 * Math.sin(time + p.phase);
                this._ctx.globalAlpha = p.alpha * blingAlpha;
                this._ctx.shadowColor = "#fff";
                this._ctx.shadowBlur = 4; // mờ ảo nhẹ
                this._ctx.fill();
                this._ctx.restore();
            }
            if (
                Matrix.currentMessageIndex === Matrix.messages.length - 1 &&
                now - Matrix.lastSwitchTime > 2000
            ) {
                // Đã hết câu cuối cùng, chuyển sang hiệu ứng trái tim
                Matrix.showHeart = true;
                return;
            }
            if (now - Matrix.lastSwitchTime > 2000) {
                const fromPoints = points;
                const toPoints = this.getLedPoints(
                    Matrix.messages[Matrix.nextMessageIndex],
                    font,
                    width,
                    height,
                    density
                );
                const maxLen = Math.max(fromPoints.length, toPoints.length);
                Matrix.ledParticles = [];
                for (let i = 0; i < maxLen; i++) {
                    const from = fromPoints[i % fromPoints.length];
                    const to = toPoints[i % toPoints.length];
                    Matrix.ledParticles.push({
                        x: from.x,
                        y: from.y,
                        tx: to.x,
                        ty: to.y,
                        alpha: 1,
                        phase: Math.random() * Math.PI * 2,
                    });
                }
                Matrix.morphing = true;
                Matrix.morphProgress = 0;
            }
        } else {
            Matrix.morphProgress += 0.04;
            let done = true;
            for (let p of Matrix.ledParticles) {
                const t = Math.min(1, Matrix.morphProgress);
                const nx = p.x + (p.tx - p.x) * t;
                const ny = p.y + (p.ty - p.y) * t;
                this._ctx.save();
                this._ctx.beginPath();
                this._ctx.arc(nx, ny, density / 2.5, 0, 2 * Math.PI);
                this._ctx.fillStyle = "#fff";
                // Hiệu ứng bling: alpha dao động nhẹ
                const blingAlpha = 0.7 + 0.3 * Math.sin(time + p.phase);
                this._ctx.globalAlpha = (p.alpha * (1 - t) + t) * blingAlpha;
                this._ctx.shadowColor = "#fff";
                this._ctx.shadowBlur = 4;
                this._ctx.fill();
                this._ctx.restore();
                if (t < 1) done = false;
            }
            if (done) {
                if (Matrix.currentMessageIndex === Matrix.messages.length - 1) {
                    Matrix.showHeart = true;
                    return;
                }
                Matrix.currentMessageIndex = Matrix.nextMessageIndex;
                Matrix.nextMessageIndex =
                    (Matrix.nextMessageIndex + 1) % Matrix.messages.length;
                Matrix.morphing = false;
                Matrix.lastSwitchTime = now;
            }
        }
    }
    renderHeart() {
        const ctx = this._ctx;
        const width = this._width;
        const height = this._height;
        // Cài đặt hiệu ứng
        const settings = {
            particles: {
                length: 2000,
                duration: 2,
                velocity: 100,
                effect: -1.3,
                size: 13,
            },
        };
        // Pool particle
        if (!this._heartParticles) {
            this._heartParticles = [];
            this._heartParticlePool = [];
            for (let i = 0; i < settings.particles.length; i++) {
                this._heartParticlePool.push({
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    age: 0,
                });
            }
            this._heartFirstActive = 0;
            this._heartFirstFree = 0;
            this._heartTime = null;
            this._heartImage = (() => {
                const canvas = document.createElement("canvas");
                const cctx = canvas.getContext("2d");
                canvas.width = settings.particles.size;
                canvas.height = settings.particles.size;
                function pointOnHeart(t) {
                    return {
                        x: 160 * Math.pow(Math.sin(t), 3),
                        y:
                            130 * Math.cos(t) -
                            50 * Math.cos(2 * t) -
                            20 * Math.cos(3 * t) -
                            10 * Math.cos(4 * t) +
                            25,
                    };
                }
                function to(t) {
                    const point = pointOnHeart(t);
                    point.x =
                        settings.particles.size / 2 +
                        (point.x * settings.particles.size) / 350;
                    point.y =
                        settings.particles.size / 2 -
                        (point.y * settings.particles.size) / 350;
                    return point;
                }
                cctx.beginPath();
                let t = -Math.PI;
                let point = to(t);
                cctx.moveTo(point.x, point.y);
                while (t < Math.PI) {
                    t += 0.01;
                    point = to(t);
                    cctx.lineTo(point.x, point.y);
                }
                cctx.closePath();
                cctx.fillStyle = "#FF5CA4";
                cctx.fill();
                const image = new window.Image();
                image.src = canvas.toDataURL();
                return image;
            })();
        }
        // Animation
        const now = performance.now() / 1000;
        const deltaTime = now - (this._heartTime || now);
        this._heartTime = now;
        // clear canvas (đã clear ở đầu render)
        // Tạo particle mới
        const particleRate =
            settings.particles.length / settings.particles.duration;
        const amount = particleRate * deltaTime;
        function pointOnHeart(t) {
            return {
                x: 160 * Math.pow(Math.sin(t), 3),
                y:
                    130 * Math.cos(t) -
                    50 * Math.cos(2 * t) -
                    20 * Math.cos(3 * t) -
                    10 * Math.cos(4 * t) +
                    25,
            };
        }
        for (let i = 0; i < amount; i++) {
            const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            const dir = {
                x: (pos.x / len) * settings.particles.velocity,
                y: (pos.y / len) * settings.particles.velocity,
            };
            // Lấy particle từ pool
            const p = this._heartParticlePool[this._heartFirstFree];
            p.position.x = width / 2 + pos.x;
            p.position.y = height / 2 - pos.y;
            p.velocity.x = dir.x;
            p.velocity.y = -dir.y;
            p.acceleration.x = dir.x * settings.particles.effect;
            p.acceleration.y = -dir.y * settings.particles.effect;
            p.age = 0;
            this._heartFirstFree++;
            if (this._heartFirstFree === settings.particles.length)
                this._heartFirstFree = 0;
            if (this._heartFirstActive === this._heartFirstFree) {
                this._heartFirstActive++;
                if (this._heartFirstActive === settings.particles.length)
                    this._heartFirstActive = 0;
            }
        }
        // Update và vẽ particle
        let i;
        // Update
        if (this._heartFirstActive < this._heartFirstFree) {
            for (i = this._heartFirstActive; i < this._heartFirstFree; i++) {
                const p = this._heartParticlePool[i];
                p.position.x += p.velocity.x * deltaTime;
                p.position.y += p.velocity.y * deltaTime;
                p.velocity.x += p.acceleration.x * deltaTime;
                p.velocity.y += p.acceleration.y * deltaTime;
                p.age += deltaTime;
            }
        }
        if (this._heartFirstFree < this._heartFirstActive) {
            for (
                i = this._heartFirstActive;
                i < settings.particles.length;
                i++
            ) {
                const p = this._heartParticlePool[i];
                p.position.x += p.velocity.x * deltaTime;
                p.position.y += p.velocity.y * deltaTime;
                p.velocity.x += p.acceleration.x * deltaTime;
                p.velocity.y += p.acceleration.y * deltaTime;
                p.age += deltaTime;
            }
            for (i = 0; i < this._heartFirstFree; i++) {
                const p = this._heartParticlePool[i];
                p.position.x += p.velocity.x * deltaTime;
                p.position.y += p.velocity.y * deltaTime;
                p.velocity.x += p.acceleration.x * deltaTime;
                p.velocity.y += p.acceleration.y * deltaTime;
                p.age += deltaTime;
            }
        }
        // Remove inactive
        while (
            this._heartParticlePool[this._heartFirstActive].age >=
                settings.particles.duration &&
            this._heartFirstActive !== this._heartFirstFree
        ) {
            this._heartFirstActive++;
            if (this._heartFirstActive === settings.particles.length)
                this._heartFirstActive = 0;
        }
        // Draw
        if (this._heartFirstActive < this._heartFirstFree) {
            for (i = this._heartFirstActive; i < this._heartFirstFree; i++) {
                const p = this._heartParticlePool[i];
                // ease
                const ease = (t) => --t * t * t + 1;
                const size =
                    settings.particles.size *
                    ease(p.age / settings.particles.duration);
                ctx.globalAlpha = 1 - p.age / settings.particles.duration;
                ctx.drawImage(
                    this._heartImage,
                    p.position.x - size / 2,
                    p.position.y - size / 2,
                    size,
                    size
                );
            }
        }
        if (this._heartFirstFree < this._heartFirstActive) {
            for (
                i = this._heartFirstActive;
                i < settings.particles.length;
                i++
            ) {
                const p = this._heartParticlePool[i];
                const ease = (t) => --t * t * t + 1;
                const size =
                    settings.particles.size *
                    ease(p.age / settings.particles.duration);
                ctx.globalAlpha = 1 - p.age / settings.particles.duration;
                ctx.drawImage(
                    this._heartImage,
                    p.position.x - size / 2,
                    p.position.y - size / 2,
                    size,
                    size
                );
            }
            for (i = 0; i < this._heartFirstFree; i++) {
                const p = this._heartParticlePool[i];
                const ease = (t) => --t * t * t + 1;
                const size =
                    settings.particles.size *
                    ease(p.age / settings.particles.duration);
                ctx.globalAlpha = 1 - p.age / settings.particles.duration;
                ctx.drawImage(
                    this._heartImage,
                    p.position.x - size / 2,
                    p.position.y - size / 2,
                    size,
                    size
                );
            }
        }
        ctx.globalAlpha = 1;
        // Thêm chữ I LOVE YOU ở giữa trái tim
        ctx.save();
        ctx.font = `bold ${Math.floor(
            height / 12
        )}px Arial, Roboto, 'sans-serif'`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#ff5ca4";
        ctx.shadowBlur = 12;
        ctx.fillText("Bảo Hân", width / 2, height / 2);
        ctx.restore();
        // --- ẢNH RƠI LIÊN TỤC 2 BÊN ---
        if (!Matrix.fallingState) {
            Matrix.loadedImages = [];
            let loaded = 0;
            for (let src of Matrix.fallingImages) {
                const img = new window.Image();
                img.src = src;
                img.onload = () => {
                    loaded++;
                };
                Matrix.loadedImages.push(img);
            }
            Matrix.fallingState = Matrix.loadedImages.map((img, i) => ({
                y: -Math.random() * height,
                speed: height / 2 + (Math.random() * height) / 2,
                x: i === 0 ? width * 0.125 : width * 0.875,
                img,
            }));
        }
        // Vẽ ảnh rơi liên tục
        for (let i = 0; i < Matrix.fallingState.length; i++) {
            const state = Matrix.fallingState[i];
            const img = Matrix.loadedImages[i];
            if (!img.complete) continue;
            const imgW = width / 4;
            const imgH = img.height * (imgW / img.width);
            // deltaTime cho hiệu ứng mượt
            const now = performance.now() / 1000;
            if (!state._lastTime) state._lastTime = now;
            const deltaTime = now - state._lastTime;
            state._lastTime = now;
            state.y += state.speed * deltaTime;
            if (state.y > height) state.y = -imgH;
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.drawImage(img, state.x - imgW / 2, state.y, imgW, imgH);
            ctx.restore();
        }
    }
}

// ---------------------------------------------------------------
// :: Init code
// ---------------------------------------------------------------
function matrix(
    canvas,
    {
        chars = null,
        font_size = 14,
        exit = true,
        font = "monospace",
        width = null,
        height = null,
        resize = true,
        color = "#0F0",
        mount = () => {},
        unmount = () => {},
        background = "rgba(0, 0,0,0.05)",
    } = {}
) {
    const matrix = new Matrix(canvas, {
        font_size: font_size,
        chars,
        font,
        color,
        background,
        width: width ?? default_width(),
        height: height ?? default_height(),
    });

    let resize_handler;

    if (resize) {
        resize_handler = () => matrix.resize(default_width(), default_height());

        window.addEventListener("resize", resize_handler);

        if (screen?.orientation) {
            screen.orientation.addEventListener("change", resize_handler);
        }
    }

    canvas.classList.add("running");

    matrix.start();
    mount(matrix);

    if (exit) {
        return new Promise(function (resolve) {
            window.addEventListener("keydown", function (e) {
                var key = e.key.toLowerCase();
                if (key === "q" || key === "escape") {
                    matrix.stop();
                    canvas.classList.remove("running");
                    if (resize_handler) {
                        window.removeEventListener("resize", resize_handler);
                        if (screen?.orientation) {
                            screen.orientation.removeEventListener(
                                "change",
                                resize_handler
                            );
                        }
                    }
                    setTimeout(() => {
                        unmount(matrix);
                        resolve();
                    }, 0);
                }
            });
        });
    }
}

export default matrix;

// ---------------------------------------------------------------
// :: Utils
// ---------------------------------------------------------------
function gen_unicode(start, end) {
    var chars = [];
    for (var i = start; i <= end; ++i) {
        chars.push(String.fromCharCode(i));
    }
    return chars;
}

matrix.range = gen_unicode;

matrix.custom_chars = make_custom_chars();

// ---------------------------------------------------------------
function rnd(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// ---------------------------------------------------------------
function default_width() {
    return window.innerWidth;
}

// ---------------------------------------------------------------
function default_height() {
    return window.innerHeight;
}

// ---------------------------------------------------------------
function make_chars(...nums) {
    return nums.map((num) => String.fromCharCode(num));
}

// ---------------------------------------------------------------
function make_custom_chars() {
    const nums = [
        0x25aa, 0x254c, 0x00a9, 0x00a6, 0x007c, 0x007a, 0x003e, 0x003c, 0x003a,
        0x0022, 0x002a, 0x002b, 0x30a2, 0x30a6, 0x30a8, 0x30aa, 0x30ab, 0x30ad,
        0x30b1, 0x30b3, 0x30b5, 0x30b7, 0x30b9, 0x30bb, 0x30bd, 0x30bf, 0x30c4,
        0x30c6, 0x30ca, 0x30cb, 0x30cc, 0x30cd, 0x30cf, 0x30d2, 0x30db, 0x30de,
        0x30df, 0x30e0, 0x30e1, 0x30e2, 0x30e4, 0x30e8, 0x30e9, 0x30ea, 0x30ef,
        0x30fc, 0xa78a, 0xe937,
    ];

    // '6' don't have its glyph
    const digits = matrix
        .range(0x0030, 0x0035)
        .concat(matrix.range(0x0037, 0x0039));

    return digits.concat(make_chars(...nums));
}
