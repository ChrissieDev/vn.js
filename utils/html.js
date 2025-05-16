/**
 * Creates HTML elements from template literals with full nested element support
 * @param {TemplateStringsArray} strings 
 * @param {...any} values 
 * @returns {HTMLElement}
 */
export default function html(strings, ...values) {
    // Create a document fragment to build our structure
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    fragment.appendChild(container);

    // First pass: Build HTML with placeholders
    let htmlStr = '';
    const elements = [];
    
    strings.forEach((str, i) => {
        htmlStr += str;
        if (i < values.length) {
            const value = values[i];
            
            if (value instanceof Node) {
                // Single element
                htmlStr += `<div data-element-id="${elements.length}"></div>`;
                elements.push(value);
            } 
            else if (Array.isArray(value)) {
                // Array of nodes
                value.flat(Infinity).forEach(item => {
                    if (item instanceof Node) {
                        htmlStr += `<div data-element-id="${elements.length}"></div>`;
                        elements.push(item);
                    } else {
                        htmlStr += escapeHtml(item);
                    }
                });
            }
            else {
                // Regular value
                htmlStr += escapeHtml(value);
            }
        }
    });

    // Parse the HTML structure
    container.innerHTML = htmlStr;

    // Second pass: Replace placeholders with actual elements
    const placeholders = container.querySelectorAll('[data-element-id]');
    placeholders.forEach(placeholder => {
        const index = parseInt(placeholder.getAttribute('data-element-id'));
        if (elements[index]) {
            // Insert the actual element (moving it, not cloning)
            placeholder.replaceWith(elements[index]);
        }
    });

    // Return the first element, or wrap multiple roots in a div
    if (container.children.length === 1) {
        return container.firstElementChild;
    }
    
    const wrapper = document.createElement('div');
    while (container.firstChild) {
        wrapper.appendChild(container.firstChild);
    }
    console.log(wrapper);
    
    return wrapper;
}

function escapeHtml(value) {
    if (value == null) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}