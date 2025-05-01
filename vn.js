import VNComponents from './components/index.module.js';



document.querySelector('html > head').append(`
    <style>
        vn-project {
            display: none;
        }
    </style>
`);

export default {
    ...VNComponents,
}