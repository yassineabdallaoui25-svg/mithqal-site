# mithqal.ma

Static website for MITHQAL (FR / EN / AR), served by GitHub Pages at https://mithqal.ma.

After changing any page, rebuild the search indexes:

    python3 _tools/build_search.py

Pages built by script (run in this order after editing texts in `_tools/grow_text.py`):

    node _tools/grow_numbers.js > /tmp/mq_numbers.json
    python3 _tools/grow.py /tmp/mq_numbers.json
    python3 -m http.server 8811 &   # needed by og.py for fonts and images
    python3 _tools/og.py            # share images (assets/og/)
    python3 _tools/build_search.py

When you change cached assets, bump the cache name `V` in `sw.js` so installed copies refresh.
