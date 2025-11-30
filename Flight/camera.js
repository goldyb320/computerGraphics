//cam sys w/ pos & fwd dir
class Camera {
    constructor() {
        //cam pos in world space
        this.eye = [0, 1, 3];
        //cam fwd dir (unit vec)
        this.forward = [0, -0.2, -1];
        //global up dir
        this.globalUp = [0, 1, 0];
        
        //movement speed
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.02;
        
        //pitch limits to prevent flip
        this.maxPitch = Math.PI / 2 - 0.1;
        this.minPitch = -Math.PI / 2 + 0.1;
    }

    //get cam's right dir
    getRight() {
        return normalize(cross(this.forward, this.globalUp));
    }

    //get cam's up dir
    getUp() {
        return cross(this.getRight(), this.forward);
    }

    //get view matrix
    getViewMatrix() {
        const right = this.getRight();
        const up = this.getUp();
        const forward = this.forward;

        //create rot matrix R
        const R = new Float32Array([
            right[0], up[0], -forward[0], 0,
            right[1], up[1], -forward[1], 0,
            right[2], up[2], -forward[2], 0,
            0, 0, 0, 1
        ]);

        //create trans matrix T
        const T = m4trans(-this.eye[0], -this.eye[1], -this.eye[2]);

        //view mat = R * T
        return m4mul(R, T);
    }

    //move cam fwd/back
    moveForward(distance) {
        const movement = mul(this.forward, distance * this.moveSpeed);
        this.eye = add(this.eye, movement);
    }

    //move cam left/right
    moveRight(distance) {
        const right = this.getRight();
        const movement = mul(right, distance * this.moveSpeed);
        this.eye = add(this.eye, movement);
    }

    //move cam up/down
    moveUp(distance) {
        const movement = mul(this.globalUp, distance * this.moveSpeed);
        this.eye = add(this.eye, movement);
    }

    //pitch cam up/down
    pitch(angle) {
        const right = this.getRight();
        const currentPitch = Math.asin(-this.forward[1]);
        const newPitch = currentPitch + angle * this.rotationSpeed;
        
        //clamp pitch to prevent flip
        const clampedPitch = Math.max(this.minPitch, Math.min(this.maxPitch, newPitch));
        
        //rot around horizontal right axis
        const pitchAngle = clampedPitch - currentPitch;
        const cosA = Math.cos(pitchAngle);
        const sinA = Math.sin(pitchAngle);
        
        //rodrigues: v_rot = v*cos + (axis×v)*sin + axis*(axis·v)*(1-cos)
        const dotProd = dot(right, this.forward);
        const crossVec = cross(right, this.forward);
        
        this.forward = normalize([
            this.forward[0] * cosA + crossVec[0] * sinA + right[0] * dotProd * (1 - cosA),
            this.forward[1] * cosA + crossVec[1] * sinA + right[1] * dotProd * (1 - cosA),
            this.forward[2] * cosA + crossVec[2] * sinA + right[2] * dotProd * (1 - cosA)
        ]);
    }

    //yaw cam left/right
    yaw(angle) {
        //rot fwd vec around global up axis
        const rotationMatrix = m3rotY(angle * this.rotationSpeed);
        this.forward = normalize(m3mul(rotationMatrix, this.forward));
    }

    //update cam based on kb input
    update(keysBeingPressed, deltaTime) {
        const speed = this.moveSpeed * deltaTime * 60; //norm for 60fps
        
        //movement
        if (keysBeingPressed['w'] || keysBeingPressed['W']) {
            this.moveForward(1);
        }
        if (keysBeingPressed['s'] || keysBeingPressed['S']) {
            this.moveForward(-1);
        }
        if (keysBeingPressed['a'] || keysBeingPressed['A']) {
            this.moveRight(-1);
        }
        if (keysBeingPressed['d'] || keysBeingPressed['D']) {
            this.moveRight(1);
        }

        //rotation
        if (keysBeingPressed['ArrowUp']) {
            this.pitch(1);
        }
        if (keysBeingPressed['ArrowDown']) {
            this.pitch(-1);
        }
        if (keysBeingPressed['ArrowLeft']) {
            this.yaw(1);
        }
        if (keysBeingPressed['ArrowRight']) {
            this.yaw(-1);
        }
    }

    //get cam pos
    getPosition() {
        return [...this.eye];
    }

    //get cam fwd dir
    getForward() {
        return [...this.forward];
    }

    //set cam pos
    setPosition(x, y, z) {
        this.eye = [x, y, z];
    }

    //set cam orient
    setOrientation(forwardX, forwardY, forwardZ) {
        this.forward = normalize([forwardX, forwardY, forwardZ]);
    }
}
