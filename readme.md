**_File Structure_**

SoccerStats/
│
├── xAssassin/ # The actual library folder
│ ├── **init**.py # Makes Python treat this folder as a library
│ ├── fetcher.py # Your WhoScored scraping logic
│ └── metrics.py # Where you will calculate xA, xT, and SCA
│
├── dashboard/ # Your DataMB clone folder
│ └── app.py # The interactive web interface
│
└── .venv/ # Your existing virtual environment
