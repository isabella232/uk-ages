#!/usr/bin/env python

from collections import defaultdict
import csv
import json

"""
0     1        2     3       4    5      6           7          8       9         10
LocID,Location,VarID,Variant,Time,AgeGrp,AgeGrpStart,AgeGrpSpan,PopMale,PopFemale,PopTotal
"""

MIN_YEAR = 2016
MAX_YEAR = 2016


def main():
    f = open('data/WPP2015_INT_F3_Population_By_Sex_Annual_Single_Medium.csv', encoding='latin-1')
    reader = csv.reader(f)
    header = next(reader)

    current_country = None
    countries = []
    data = defaultdict(dict)

    for row in reader:
        country_code = row[0]
        country = row[1]

        # ONLY UK
        if country_code != '826':
            continue

        if country_code != current_country:
            if current_country:
                save_country(current_country, data)

            current_country = country_code
            countries.append((country_code, country))

        year = row[4]

        if int(year) < MIN_YEAR or int(year) > MAX_YEAR:
            continue

        age = row[6]
        male = float(row[8])
        female = float(row[9])

        data[year][age] = [male, female]

    f.close()

    # Save last country
    save_country(current_country, data)


def save_country(country, data):
    print('Saving %s' % country)

    with open('src/data/countries/%s.json' % country, 'w') as f:
        json.dump(data, f)


if __name__ == '__main__':
    main()
