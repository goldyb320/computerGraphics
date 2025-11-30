//fractal terrain gen using fault-based algo
class TerrainGenerator {
    constructor(size, maxHeight = 1.0) {
        this.size = size;
        this.maxHeight = maxHeight;
        this.heightMap = new Array(size * size).fill(0);
        this.vertices = [];
        this.normals = [];
        this.indices = [];
    }

    //gen fractal terrain using fault-based algo
    generate() {
        //start w/ flat terrain
        this.heightMap.fill(0);
        
        //apply faults
        const faultCount = Math.floor(this.size * 0.4); //more faults for larger terrain
        this.applyFaults(faultCount);
        
        //norm heights
        this.normalizeHeights();
        
        this.generateMesh();
    }

    //apply fault-based fractal algo
    applyFaults(faultCount) {
        for(let f = 0; f < faultCount; f++) {
            //random fault line
            const x1 = Math.random() * 2 - 1;
            const z1 = Math.random() * 2 - 1;
            const x2 = Math.random() * 2 - 1;
            const z2 = Math.random() * 2 - 1;
            
            //calc which side of line each vert is on
            for(let i = 0; i < this.size; i++) {
                for(let j = 0; j < this.size; j++) {
                    const x = (j / (this.size - 1) - 0.5) * 2; //convert to [-1, 1]
                    const z = (i / (this.size - 1) - 0.5) * 2; //convert to [-1, 1]
                    
                    //cross prod to det which side of line
                    const cross = (x2 - x1) * (z - z1) - (z2 - z1) * (x - x1);
                    
                    //add height based on which side of fault line
                    const heightChange = cross > 0 ? 0.1 : -0.1;
                    this.heightMap[i * this.size + j] += heightChange;
                }
            }
        }
    }

    //norm heights to consistent range
    normalizeHeights() {
        let minHeight = Infinity;
        let maxHeight = -Infinity;
        
        //find min & max heights
        for(let i = 0; i < this.heightMap.length; i++) {
            const height = this.heightMap[i];
            minHeight = Math.min(minHeight, height);
            maxHeight = Math.max(maxHeight, height);
        }
        
        //norm to range [-0.5, 0.5]
        const range = maxHeight - minHeight;
        if (range > 0) {
            const scale = this.maxHeight;
            for(let i = 0; i < this.heightMap.length; i++) {
                this.heightMap[i] = scale * (this.heightMap[i] - 0.5 * (maxHeight + minHeight)) / range;
            }
        }
    }

    //gen mesh verts, normals, & indices
    generateMesh() {
        this.vertices = [];
        this.normals = [];
        this.indices = [];

        const scale = 10.0; //scale factor for terrain size

        //gen verts
        for(let y = 0; y < this.size; y++) {
            for(let x = 0; x < this.size; x++) {
                const height = this.heightMap[x + y * this.size];
                this.vertices.push(
                    (x / (this.size - 1) - 0.5) * scale,
                    height,
                    (y / (this.size - 1) - 0.5) * scale
                );
            }
        }

        //gen normals
        for(let y = 0; y < this.size; y++) {
            for(let x = 0; x < this.size; x++) {
                const normal = this.calculateNormal(x, y);
                this.normals.push(normal[0], normal[1], normal[2]);
            }
        }

        //gen indices for tris
        for(let y = 0; y < this.size - 1; y++) {
            for(let x = 0; x < this.size - 1; x++) {
                const topLeft = y * this.size + x;
                const topRight = topLeft + 1;
                const bottomLeft = (y + 1) * this.size + x;
                const bottomRight = bottomLeft + 1;

                //first tri
                this.indices.push(topLeft, bottomLeft, topRight);
                //second tri
                this.indices.push(topRight, bottomLeft, bottomRight);
            }
        }
    }

    //calc normal at given pos
    calculateNormal(x, y) {
        const getHeight = (px, py) => {
            if (px < 0 || px >= this.size || py < 0 || py >= this.size) {
                return 0;
            }
            return this.heightMap[px + py * this.size];
        };

        const scale = 10.0;
        const step = 1.0 / (this.size - 1) * scale;

        const heightL = getHeight(x - 1, y);
        const heightR = getHeight(x + 1, y);
        const heightD = getHeight(x, y - 1);
        const heightU = getHeight(x, y + 1);

        const normal = normalize([
            (heightL - heightR) / (2.0 * step),
            1.0,
            (heightD - heightU) / (2.0 * step)
        ]);

        return normal;
    }

    //get height at world pos
    getHeightAt(x, z) {
        const scale = 10.0;
        const normalizedX = (x / scale + 0.5) * (this.size - 1);
        const normalizedZ = (z / scale + 0.5) * (this.size - 1);

        const x1 = Math.floor(normalizedX);
        const z1 = Math.floor(normalizedZ);
        const x2 = Math.min(x1 + 1, this.size - 1);
        const z2 = Math.min(z1 + 1, this.size - 1);

        const fx = normalizedX - x1;
        const fz = normalizedZ - z1;

        const h1 = this.heightMap[x1 + z1 * this.size];
        const h2 = this.heightMap[x2 + z1 * this.size];
        const h3 = this.heightMap[x1 + z2 * this.size];
        const h4 = this.heightMap[x2 + z2 * this.size];

        const h12 = h1 * (1 - fx) + h2 * fx;
        const h34 = h3 * (1 - fx) + h4 * fx;

        return h12 * (1 - fz) + h34 * fz;
    }
}
