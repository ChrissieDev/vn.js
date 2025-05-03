import VNComponents from './components/index.module.js';
import VNAnimation from './engine/VNAnimation.js';


document.querySelector('html > head').append(`
    <style>
        vn-project {
            display: none;
        }
    </style>
`);

export default {
    VNAnimation,
    ...VNComponents,
    
}