import * as dat from 'dat-gui';
import { makeNoise3D } from "open-simplex-noise";
import * as paper from 'paper';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';

export default class Cloth {

    constructor(canvas_id) {
        this.params = {
            polygons: true,
            inversed: false,
            n_polygons: 100,
            n_vertices: 3,
            smoothing: 123,
            radius: 2.5,
            theta_increment: 585,
            inner_hole: 0,
            x_multiplier: 45,
            y_multiplier: 45,
            smooth_path: true,
            polar: false,
            moire: true,
            moire_x: 3,
            moire_y: 3,
            angle_offset: 1.00
        }

        this.functions = {
            export_svg: this.exportSVG,
        }

        Number.prototype.map = function (in_min, in_max, out_min, out_max) {
            return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        }

        this.gui = new dat.GUI();
        this.canvas = document.getElementById(canvas_id);
        paper.setup(this.canvas);
        this.noise3D = makeNoise3D(Date.now());

        this.center = paper.view.center;

        this.init_gui();
        this.reset();
    }

    reset() {
        paper.project.currentStyle = {
            strokeColor: 'black',
            //fillColor: '#00000011'
        };
        
        paper.project.clear();
        this.draw();
        paper.view.draw();
    }

    draw() {
        this.render();
        this.params.moire ? this.render("moire") : null;
    }

    render(moire) {
        let n_polygons = this.params.n_polygons;
        let n_vertices = this.params.n_vertices;
        for (let r = this.params.inner_hole; r < 1; r += 1/n_polygons) {
            let path = new paper.Path();
            
            for (let j = 0; j < 1; j += 1/n_vertices) {
                let angle = (6.28318530718 / n_vertices) * j * n_vertices ;
                angle += r * this.params.angle_offset
                
                let xy = this.position_texture(r, angle)
                if (moire == "moire") {
                    path.add(new paper.Point(xy[0] + this.params.moire_x, xy[1] + this.params.moire_y))
                } else {
                    path.add(new paper.Point(xy[0], xy[1]))
                }
                
            }
            path.closePath();
            let factor = this.params.inversed ? r.map(0, 1, 1, 0): r.map(0,1,0,1)
            if (this.params.smooth_path) {
                this.params.polygons? path.smooth({ factor: factor, type: "geometric" }) : path.smooth({ factor: factor, type: "asymmetric" }); // catmull-rom, geometric, assymetric
            }
        }
    }

    position_texture(r, theta) {
        const height = paper.view.bounds.height / this.params.radius;
        const width = paper.view.bounds.width / this.params.radius;

        let radius;
        if (width > height) {
            radius = height;
        } else {
            radius = width;
        }

        let x = r * Math.cos(theta) * radius + paper.view.center.x;
        let y = r * Math.sin(theta) * radius + paper.view.center.y;

        let yoffset;
        let xoffset;
        if (this.params.polar) {
            const smoothing = this.params.smoothing.map(0, 200, 0, 1);
            yoffset = this.noise3D(r/smoothing, theta/smoothing, 0)
            xoffset = this.noise3D(r/smoothing, theta/smoothing, 0)
        } else {
            yoffset = this.noise3D(x/this.params.smoothing, y/this.params.smoothing, 0)
            xoffset = this.noise3D(x/this.params.smoothing, y/this.params.smoothing, 0)
        }
        

        x = x - xoffset * this.params.x_multiplier
        y = y - yoffset * this.params.y_multiplier
        
        return [x, y]
    }

    init_gui() {
        let noise = this.gui.addFolder('noise');

        noise.add(this.params, 'smoothing', 0, 200).onChange((value) => {
            this.params.smoothing = value;
            this.reset();
        });

        noise.add(this.params, 'x_multiplier', 0, 100).onChange((value) => {
            this.params.x_multiplier = value;
            this.reset();
        });

        noise.add(this.params, 'y_multiplier', 0, 100).onChange((value) => {
            this.params.y_multiplier = value;
            this.reset();
        });

        noise.add(this.params, 'polar').onChange((value) => {
            this.params.polar = value;
            this.reset();
        });

        let moire = this.gui.addFolder('moire');

        moire.add(this.params, 'moire').onChange((value) => {
            this.params.moire = value;
            this.reset();
        });

        moire.add(this.params, 'moire_x', 0, 10).onChange((value) => {
            this.params.moire_x = value;
            this.reset();
        });

        moire.add(this.params, 'moire_y', 0, 10).onChange((value) => {
            this.params.moire_y = value;
            this.reset();
        });

        let polygons = this.gui.addFolder('polygons');

        polygons.add(this.params, 'polygons').onChange((value) => {
            this.params.polygons = value;
            this.reset();
        });

        polygons.add(this.params, 'inversed').onChange((value) => {
            this.params.inversed = value;
            this.reset();
        });

        polygons.add(this.params, 'n_polygons', 50, 200).step(1).onChange((value) => {
            this.params.n_polygons = value;
            this.reset();
        });

        polygons.add(this.params, 'n_vertices', 3, 20).step(1).onChange((value) => {
            this.params.n_vertices = value;
            this.reset();
        });

        polygons.add(this.params, 'angle_offset', 0, 3).onChange((value) => {
            this.params.angle_offset = value;
            this.reset();
        });
        

        polygons.add(this.params, 'radius', 2, 10).onChange((value) => {
            this.params.radius = value;
            this.reset();
        });
        

        polygons.add(this.params, 'inner_hole', 0, 1).onChange((value) => {
            this.params.inner_hole = value;
            this.reset();
        });

        polygons.add(this.params, 'smooth_path').onChange((value) => {
            this.params.smooth_path = value;
            this.reset();
        });

        this.gui.add(this.functions, 'export_svg').name('Export SVG');
    }

    exportSVG() {

        var svg = paper.project.exportSVG({asString: true});
        var blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
        saveAs(blob, 'superformula.svg');
    }
}