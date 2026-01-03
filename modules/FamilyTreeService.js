// modules/FamilyTreeService.js
// D3-based family tree renderer with orientation, images, depth limit, descendants toggle

class FamilyTreeService {
    constructor(app) {
        this.app = app;
        console.log('FamilyTreeService (D3-enhanced) initialized');
    }

    // Public render function. options:
    // { orientation: 'vertical'|'horizontal', depth: number, descendants: boolean, includeImages: boolean }
    async renderTree(containerId, rootPersonId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('FamilyTreeService: container not found', containerId);
            return;
        }

        // Defaults
        const cfg = Object.assign({
            orientation: 'vertical',
            depth: 5,
            descendants: false,
            includeImages: true
        }, options);

        container.innerHTML = '';
        // Build hierarchical data (async to fetch images)
        const rootData = await this._buildTreeAsync(rootPersonId, cfg);
        if (!rootData) {
            container.innerHTML = '<div class="text-gray-500 p-4">No family data available.</div>';
            return;
        }

        // Layout parameters
        const containerWidth = Math.max(720, container.clientWidth || 900);
        const maxDepth = this._getMaxDepth(rootData);
        const depthSpacing = 120; // vertical spacing per generation
        const nodeHeight = 72;
        const svgHeight = Math.max(420, (maxDepth + 1) * depthSpacing + 40);

        // Create SVG with responsive viewBox
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', svgHeight)
            .attr('viewBox', `0 0 ${containerWidth} ${svgHeight}`)
            .style('overflow', 'visible');

        // Remove previous defs if any, then add drop shadow filter
        svg.select('defs').remove();
        const defs = svg.append('defs');
        const filter = defs.append('filter').attr('id', 'dtree-shadow');
        filter.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 6).attr('flood-opacity', 0.05);

        // Group for zoom/pan
        const g = svg.append('g')
            .attr('transform', 'translate(20,20)');

        // Build d3.hierarchy; children property is `children`
        const root = d3.hierarchy(rootData);

        // Tree layout: swap size depending on orientation
        let treeLayout;
        if (cfg.orientation === 'vertical') {
            treeLayout = d3.tree().nodeSize([depthSpacing, 260]);
            treeLayout(root);
            // x = depth * stuff (root.x), y = root.y
        } else {
            // Horizontal: rotate axes (makes tree expand rightwards)
            treeLayout = d3.tree().nodeSize([180, 160]);
            treeLayout(root);
        }

        // Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.4, 2.5])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Link generator based on orientation
        const linkGenerator = cfg.orientation === 'vertical'
            ? d3.linkVertical().x(d => d.x).y(d => d.y)
            : d3.linkHorizontal().x(d => d.y).y(d => d.x);

        // Links
        g.append('g')
            .selectAll('path.link')
            .data(root.links())
            .join('path')
            .attr('class', 'd3-link')
            .attr('d', d => {
                // d.source and d.target have x,y from layout
                return linkGenerator({
                    source: { x: d.source.x, y: d.source.y },
                    target: { x: d.target.x, y: d.target.y }
                });
            })
            .attr('fill', 'none')
            .attr('stroke', '#e6e7eb')
            .attr('stroke-width', 1.7);

        // Node group
        const node = g.append('g')
            .selectAll('g.node')
            .data(root.descendants())
            .join('g')
            .attr('class', d => `d3-node ${d.children ? 'd3-node--internal' : 'd3-node--leaf'}`)
            .attr('transform', d => {
                if (cfg.orientation === 'vertical') {
                    return `translate(${d.x},${d.y})`;
                } else {
                    return `translate(${d.y},${d.x})`;
                }
            })
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                this.onNodeClick(d.data.id);
            });

        // Node card dimensions
        const cardW = 240;
        const cardH = 64;
        const cardRx = 12;

        // Background rect with shadow
        node.append('rect')
            .attr('class', 'd3-node-rect')
            .attr('x', -12)
            .attr('y', -cardH / 2)
            .attr('width', cardW)
            .attr('height', cardH)
            .attr('rx', cardRx)
            .attr('ry', cardRx)
            .attr('fill', '#ffffff')
            .attr('stroke', '#e6e7eb')
            .attr('filter', 'url(#dtree-shadow)');

        // If image exists, render as circle on left
        node.each(function(d) {
            const sel = d3.select(this);
            if (d.data.imageUrl) {
                sel.append('clipPath')
                    .attr('id', `clip-${d.data.id}`)
                    .append('circle')
                    .attr('cx', 12)
                    .attr('cy', 0)
                    .attr('r', 22);

                sel.append('image')
                    .attr('xlink:href', d.data.imageUrl)
                    .attr('x', -8)
                    .attr('y', -22)
                    .attr('width', 44)
                    .attr('height', 44)
                    .attr('clip-path', `url(#clip-${d.data.id})`);
            } else {
                // icon placeholder
                sel.append('text')
                    .attr('x', 12)
                    .attr('y', 6)
                    .attr('text-anchor', 'middle')
                    .attr('class', 'node-avatar-emoji')
                    .style('font-size', '18px')
                    .text('👤');
            }
        });

        // Name text (to the right of avatar)
        node.append('text')
            .attr('class', 'd3-node-text')
            .attr('x', 36)
            .attr('y', -6)
            .style('font-family', 'Inter, system-ui, -apple-system, "Segoe UI", Roboto')
            .style('font-weight', 700)
            .style('font-size', '14px')
            .text(d => d.data.name || '');

        // ID / dates subtext
        node.append('text')
            .attr('class', 'd3-node-subtext')
            .attr('x', 36)
            .attr('y', 14)
            .style('font-family', 'Inter, system-ui')
            .style('font-size', '12px')
            .style('fill', '#6b7280')
            .text(d => {
                let bits = [];
                if (d.data.birthYear) bits.push(d.data.birthYear);
                if (d.data.deathYear) bits.push(d.data.deathYear);
                if (bits.length) return bits.join('–');
                return d.data.id || '';
            });

        // Center initial view so root is visible
        try {
            const rootNode = root.descendants().find(n => n.data.id === rootPersonId);
            const startX = (containerWidth / 2) - (rootNode ? (cfg.orientation === 'vertical' ? rootNode.x : rootNode.y) : 0);
            svg.transition().duration(200).call(zoom.transform, d3.zoomIdentity.translate(startX, 20).scale(1));
        } catch (e) {
            // ignore
        }
    }

    // Asynchronous build: includes images optionally, supports depth & descendants
    async _buildTreeAsync(personId, cfg) {
        if (!personId) return null;
        const peopleMap = new Map(this.app.people.map(p => [p.id, p]));
        const visited = new Set();
        const maxDepth = Math.max(0, parseInt(cfg.depth || 5));

        const build = async (id, depth = 0) => {
            if (!id) return null;
            if (visited.has(id)) return null;
            if (depth > maxDepth) return null;

            const person = peopleMap.get(id);
            if (!person) return null;
            visited.add(id);

            const node = {
                id: person.id,
                name: person.name || person.id,
                birthYear: this._extractYear(person.birthDate),
                deathYear: this._extractYear(person.deathDate),
                children: []
            };

            // fetch image if requested
            if (cfg.includeImages && this.app.imageService && typeof this.app.imageService.getBestImageUrl === 'function') {
                try {
                    const url = await this.app.imageService.getBestImageUrl(person.id);
                    if (url) node.imageUrl = url;
                } catch (e) { /* ignore */ }
            }

            // Ancestors: parents become children
            const parents = [];
            if (person.fatherId) parents.push(person.fatherId);
            if (person.motherId) parents.push(person.motherId);

            // Add parent nodes
            for (const pid of parents) {
                const pn = await build(pid, depth + 1);
                if (pn) node.children.push(pn);
            }

            // Optionally include descendants (children) by scanning dataset
            if (cfg.descendants) {
                const childIds = [];
                for (const p of this.app.people) {
                    if (p.fatherId === person.id || p.motherId === person.id) {
                        childIds.push(p.id);
                    }
                }
                for (const cid of childIds) {
                    const cn = await build(cid, depth + 1);
                    if (cn) node.children.push(cn);
                }
            }

            return node;
        };

        return await build(personId, 0);
    }

    _extractYear(dateString) {
        if (!dateString) return null;
        const match = dateString.match(/\b(\d{4})\b/);
        return match ? match[1] : null;
    }

    _getMaxDepth(node) {
        if (!node) return 0;
        if (!node.children || node.children.length === 0) return 0;
        return 1 + Math.max(...node.children.map(c => this._getMaxDepth(c)));
    }

    onNodeClick(personId) {
        const person = this.app.people.find(p => p.id === personId);
        if (!person) return;

        this.app.selectedPerson = person;

        setTimeout(() => {
            this.app.hideFamilyTree();
            if (this.app.uiRenderer) {
                this.app.uiRenderer.renderSelectedPerson();
                this.app.uiRenderer.renderPeopleList();
            }
        }, 80);
    }
}
