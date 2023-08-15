import { db } from "../firebase";
import { query, orderBy, getDocs, collection } from "firebase/firestore";
import { useState, useEffect } from 'react';
import {useNavigate} from "react-router-dom";
import {useAuth} from "../context/AuthProvider";
import { doc, deleteDoc } from "firebase/firestore";
import './log-style.css';

const fetchData = async () => {
    const visitsCollection = collection(db, "visits");
    const q = query(visitsCollection, orderBy("formattedTimestamp", "desc")); // Optional: order by timestamp in descending order
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const locationString = `${data.location.city}, ${data.location.region}, ${data.location.country}`;
        return {
            id: doc.id,
            ...data,
            locationString,
        }
    });
};

const fullCountryName = (countryCode) => {
    switch (countryCode.toUpperCase()) {
        case 'US':
            return 'United States';
        case 'GB':
            return 'United Kingdom';
        case 'KR':
            return 'South Korea';
        case 'TW':
            return 'Taiwan';
        case 'HK':
            return 'Hong Kong';
        case 'VN':
            return 'Vietnam';
        case 'CA':
            return 'Canada';
        case 'JP':
            return 'Japan';
        case 'SG':
            return 'Singapore';
        case 'CN':
            return 'China';
        default:
            return countryCode;
    }
}

const unLocalTimeString = (timeString) => {
    const [date, time] = timeString.split(', ');
    const [month, day, year] = date.split('/');
    // const [time12, ampm] = time.split(' ');
    // const [hour, minute, second] = time12.split(':');
    return new Date(year, month - 1, day);
}

console.log('unLocalTimeString',unLocalTimeString('8/1/2021, 12:00:00 AM'));
console.log('test 1', unLocalTimeString('8/4/2021, 12:00:00 AM') - unLocalTimeString('8/1/2021, 12:00:00 AM'));
console.log('test 2', unLocalTimeString('8/1/2021, 12:00:00 AM') - unLocalTimeString('8/4/2021, 12:00:00 AM'));

const Log = () => {
    const [visits, setVisits] = useState([]);
    const [visitsInitials, setVisitsInitials] = useState([]);
    const [locationStrings, setlocationStrings] = useState([]);
    const [locationsFilters, setlocationsFilters] = useState({});
    const [countries, setCountries] = useState([]);
    const [countriesFilters, setCountriesFilters] = useState({});
    const [condition, setCondition] = useState('');

    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleRegionCheckChange = (event) => {
        setlocationsFilters(prev => ({
            ...prev,
            [event.target.name]: event.target.checked
        }));
    }

    const handleCountryCheckChange = (event) => {
        setCountriesFilters(prev => ({
            ...prev,
            [event.target.name]: event.target.checked
        }));
    }

    const setAllCountries = (bool) => {
        const newCountriesFilters = countries.reduce((acc, country) => {
            acc[country] = bool;
            return acc;
        }, {});

        setCountriesFilters(newCountriesFilters);
    }

    const deleteVisit = async (visitId, location = '') => {
        // 弹出确认对话框 Double check with the user
        const userConfirmed = window.confirm(`Are you sure you want to delete this record forever? ${visitId} from ${fullCountryName(location) || '...'}?`);
        if (!userConfirmed) {
            return;  // User clicked 'Cancel'
        }

        const visitRef = doc(db, "visits", visitId);
        try {
            await deleteDoc(visitRef);
            // 在此处更新UI，例如通过从visits数组中删除该访问记录
            setVisits(visits => visits.filter(visit => visit.id !== visitId));
            alert(`Record ${visitId} from ${location || '...'} deleted successfully!`)
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    };

    useEffect(() => {
        const fetchVisits = async () => {
            setCondition('fetching data')
            const fetchedVisits = await fetchData();
            console.log('fetchedVisits',fetchedVisits)
            const sortedVisits = fetchedVisits.sort((a, b) => unLocalTimeString(b.formattedTimestamp) - unLocalTimeString(a.formattedTimestamp));

            const uniqueLocations = [...new Set(fetchedVisits.map(visit => visit.locationString))];

            const locationsFiltersInitial = uniqueLocations.reduce((acc, location) => {
                acc[location] = true;
                return acc;
            }, {});

            const uniqueCountries = [...new Set(fetchedVisits.map(visit => visit.location.country))];
            const countriesFiltersInitial = uniqueCountries.reduce((acc, country) => {
                acc[country] = true;
                return acc;
            }, {});

            setVisits(sortedVisits);
            setVisitsInitials(sortedVisits);
            setlocationStrings(uniqueLocations);
            setlocationsFilters(locationsFiltersInitial);
            setCountries(uniqueCountries);
            setCountriesFilters(countriesFiltersInitial);
            setCondition('data set')
        };

        if (!currentUser) {
            navigate("/login");  // Redirect to login if the user is not authenticated
        }

        fetchVisits();
    }, []);


    useEffect(() => {
        const newVisits = visitsInitials
            .filter(visit => !!locationsFilters[visit.locationString])
            .filter(visit => !!countriesFilters[visit.location.country]);

        setVisits(newVisits);
    },[locationsFilters, countriesFilters])

    return (
        <div>
            <div className={'grid grid-cols-2 gap-3 px-6'}>
                {/* all records */}
                <div className={'scrollable-container px-6'}>
                    {visits.map((visit,index) => (
                        <div key={visit.id} className={'text-white record-container'}>
                            <div>
                                <span style={{width:'18px'}}>{index}</span><br/>
                                <span>{visit.id.substring(0,3)}...</span>
                            </div>
                            <div className={'flex flex-col'}>
                                <span>Time: {visit.formattedTimestamp}</span>
                                <span>IP: {visit.ipAddress}</span>
                                <span>Location: {visit.location?.city}-{visit.location?.region}-<b>{fullCountryName(visit.location?.country)}</b></span>
                            </div>
                            <div>
                                <button onClick={()=>deleteVisit(visit.id, visit.location?.country)}>Delete Forever</button>
                            </div>
                        </div>
                    ))}
                </div>
                {/* controlling console */}
                <div className={'scrollable-container'}>
                    <h1 className={'text-white'}>Log: {condition}</h1>
                    <h1 className={'text-white'}>Filter:</h1>
                    <div className={'text-white grid grid-cols-2'}>
                        <div>
                            <span>Region:</span>
                            {locationStrings.map(location => {
                                return (
                                    <div key={location}>
                                        <input type="checkbox" name={location} checked={!!locationsFilters[location]} onChange={handleRegionCheckChange}/>
                                        &nbsp;<label htmlFor={location}>{location}</label>
                                    </div>)})}
                        </div>
                        <div>
                            <span>Country:</span>
                            {countries.map(country => {
                                return (
                                    <div key={country} className={'flex flex-row'}>
                                        <input type="checkbox" name={country} checked={!!countriesFilters[country]} onChange={handleCountryCheckChange}/>
                                        &nbsp;<label htmlFor={country}>{fullCountryName(country)}</label>
                                    </div>)})
                            }
                            <div>
                                <button className={'btn'} onClick={()=>setAllCountries(true)}>Check all</button>
                                <button className={'btn'} onClick={()=>setAllCountries(false)}>Uncheck all</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default Log;