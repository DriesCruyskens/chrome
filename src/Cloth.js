import * as dat from 'dat-gui';
import { makeNoise3D } from "open-simplex-noise";
import * as paper from 'paper';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';

export default class Cloth {

    constructor(canvas_id) {
        this.params = {
            map: true,
            polygons: true,
            inversed: false,
            n_polygons: 100,
            n_vertices: 20,
            seed: 1000,
            smoothing: 42,
            radius: 2.5,
            smoothing_method: 'geometric',
            smoothing_sampling: 'radius',
            path_noise_smoothing: 1.,
            inner_hole: 0,
            x_multiplier: 18,
            y_multiplier: 18,
            smooth_path: true,
            polar: false,
            path_method: 'spiral',
            moire: true,
            moire_x: 3,
            moire_y: 3,
            angle_offset: 1.00,
            single_axis_noise: true,
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

    randomize() {
        this.params = {
            map: Boolean(Math.round(Math.random())),
            polygons: true,
            inversed: false,
            n_polygons: 100,
            n_vertices: 3, //Math.random() > .5 ? 20 : 3,
            seed: Math.random()*1000,
            smoothing: Math.random()*40 + 140,
            radius: 2.5,
            smoothing_method: 'geometric',
            smoothing_sampling: 'radius',
            path_noise_smoothing: 1.,
            inner_hole: 0,
            x_multiplier: Math.random()*45,
            y_multiplier: Math.random()*45,
            smooth_path: true,
            polar: Boolean(Math.round(Math.random())),
            path_method: 'spiral',
            moire: true,
            moire_x: 3,
            moire_y: 3,
            angle_offset: Math.random()*6 - 3
        }
        this.reset()
    }

    reset() {
        paper.project.currentStyle = {
            strokeColor: 'black',
            //fillColor: '#0000FF01'
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
        let path
        this.params.path_method == 'spiral' ? path=new paper.Path() : null

        for (let r = this.params.inner_hole; r < 1; r += 1/n_polygons) {

            this.params.path_method == 'polygons' ? path=new paper.Path() : null
            for (let j = 0; j < 1; j += 1/n_vertices) {
                let angle = ((Math.PI * 2 / n_vertices) * j * n_vertices) ;
                angle += r * this.params.angle_offset
                
                let xy = this.position_texture(r, angle)
                if (moire == "moire") {
                    path.add(new paper.Point(xy[0] + this.params.moire_x, xy[1] + this.params.moire_y))
                } else {
                    path.add(new paper.Point(xy))
                }
                if (this.params.smoothing_sampling == 'noise') {
                    let smoothing = this.params.path_noise_smoothing.map(0, 1, 0, 1);
                    let factor = this.noise3D(r/smoothing, angle/smoothing, this.params.seed)
                    factor = factor.map(-1, 1, 0, 1)
                    path.smooth({ 
                        factor: factor, 
                        type: this.params.smoothing_method,
                        from: -1,
                        to:  -2})
                }
            }
            if (this.params.smoothing_sampling == 'radius') {
                let factor = this.params.inversed ? r.map(0, 1, 1, 0): r.map(0,1,0,1)

            if (this.params.smooth_path) {
                
                if (this.params.path_method == 'spiral') {
                    path.smooth({ 
                        factor: factor, 
                        type: this.params.smoothing_method,
                        from: -1,
                        to: -n_vertices-2 })
            
                } else if (this.params.path_method == 'polygons') {
                    path.closePath()
                    path.smooth({ 
                        factor: factor, 
                        type: this.params.smoothing_method
                    })
                }
            }
            }
            
        }
        this.params.path_method == 'spiral'? path.removeSegment(path.segments.length-1): null
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

        let yoffset, xoffset, z
        z = this.params.single_axis_noise ? 0 : 200000
        if (this.params.polar) {
            const smoothing = this.params.smoothing.map(0, 200, 0, 1);
            yoffset = this.noise3D(r/smoothing, theta/smoothing, this.params.seed + z)
            xoffset = this.noise3D(r/smoothing, theta/smoothing, this.params.seed)
        } else {
            yoffset = this.noise3D(x/this.params.smoothing, y/this.params.smoothing, this.params.seed + z) // if z is the same, has no effect on certain axis
            xoffset = this.noise3D(x/this.params.smoothing, y/this.params.smoothing, this.params.seed)
        }

        if (this.params.map) {
            xoffset = xoffset.map(-1, 1, 0, 1)
            yoffset = yoffset.map(-1, 1, 0, 1)
        }

        x = x - xoffset * this.params.x_multiplier
        y = y - yoffset * this.params.y_multiplier
        
        return [x, y]
    }

    init_gui() {
        this.gui.add(this.params, 'map').onChange((value) => {
            this.params.map = value;
            this.reset();
        });

        this.gui.add(this.params, 'path_method', ['spiral', 'polygons',]).onChange((value) => {
            this.params.path_method = value;
            this.reset();
        });

        this.gui.add(this, 'randomize').name('Randomize');

        let noise = this.gui.addFolder('noise');

        noise.add(this.params, 'seed', 0, 2000).onChange((value) => {
            this.params.seed = value;
            this.reset();
        });
        
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

        noise.add(this.params, 'single_axis_noise').onChange((value) => {
            this.params.single_axis_noise = value;
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

        polygons.add(this.params, 'inversed').onChange((value) => {
            this.params.inversed = value;
            this.reset();
        });

        polygons.add(this.params, 'n_polygons', 50, 200).step(1).onChange((value) => {
            this.params.n_polygons = value;
            this.reset();
        });

        polygons.add(this.params, 'n_vertices', 3, 50).step(1).onChange((value) => {
            this.params.n_vertices = value;
            this.reset();
        });

        polygons.add(this.params, 'angle_offset', -3, 3).onChange((value) => {
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

        polygons.add(this.params, 'smoothing_method', [/* 'continuous', 'asymmetric',  */'catmull-rom', 'geometric']).onChange((value) => {
            this.params.smoothing_method = value;
            this.reset();
        });

        polygons.add(this.params, 'smoothing_sampling', ['radius', 'noise']).onChange((value) => {
            this.params.smoothing_sampling = value;
            this.reset();
        });

        polygons.add(this.params, 'path_noise_smoothing', 0, 1).onChange((value) => {
            this.params.path_noise_smoothing = value;
            this.reset();
        });

        this.gui.add(this, 'exportSVG').name('Export SVG');
    }

    exportSVG() {
        var svg = paper.project.exportSVG({asString: true});
        var blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
        saveAs(blob, 'chromecloth' + JSON.stringify(this.params) + '.svg');
    }
}