Scarborough Garage Sale Map
Developed for the Scarborough Environmental Association (SEA)

Overview

This project is a web-based interactive map showing garage sales in Scarborough.

Unlike the original grocery map, this version is designed for gargae sales. Residents submit their garage sales through a Google Form, and validated entries are displayed on the map.

The map is built using Leaflet.js and loads data from a Google Sheets CSV, allowing updates without modifying the code.

The map runs as a static webpage and can be hosted on any standard web server.

---

How It Works

1. Residents submit garage sales via a Google Form
2. Responses are stored in a Google Sheet
3. Volunteers review and validate submissions
4. Approved entries are included in a "map_data" sheet
5. The map loads this sheet as a CSV and displays the points

Only validated and active sales are shown on the map.

---

File Structure

--index.html
Main webpage that loads the map

--js/
JavaScript controlling map behavior, filtering, and popups

--styles/
CSS styling for the map and UI

--icons/
Marker icons (e.g. "This Week", "Future Week")

--data/ (optional)
Local GeoJSON files (e.g. Scarborough boundary)

---

Hosting the Map

To host the map:

- Upload the entire folder to a web server
- Ensure the folder structure is preserved
- Open:

/folder-name/index.html

Example:

https://example.org/scarborough-garage-sale-map/

No server-side software is required.

---

Updating the Data

Garage sale data is managed through Google Sheets.

Workflow:

- Form submissions are stored in:
  Form_Responses

- Approved entries are copied or filtered into:
  map_data (or map_working)

- The map reads from a published CSV version of this sheet

Important fields used by the map:

- sale_name
- address
- directions_url
- start_date
- end_date
- schedule_text
- description
- latitude
- longitude
- effective_end_date
- timing_category (e.g. "This Week", "Future Week")
- show_on_map
- validated

Only rows marked as active (aka not "Expired") and validated (with a value of "Y") are displayed.

---

Time-Based Display

Garage sales are categorized based on their timing:

- "This Week" → sales happening within 7 days
- "Future Week" → sales more than 7 days away

Expired sales are automatically hidden using the effective_end_date field.

---

Technologies Used

Leaflet.js
OpenStreetMap basemap
Google Forms (data collection)
Google Sheets (data management + CSV output)
PapaParse (CSV parsing)

---

Contact

For questions about the map or dataset:

Christopher Hoornaert
cj.hoornaert@gmail.com
(Project developer)
